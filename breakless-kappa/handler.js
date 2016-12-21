'use strict';
const AWS = require('aws-sdk');
const assert = require('assert');
const fs = require('fs');
const AdmZip = require('adm-zip');
const mime = require('mime-types');

const prefixRex = /^breakless\-react\/build\//;

const outBucket = "breakless.bike";
const outRegion = "us-east-1";
const codepipeline = new AWS.CodePipeline();

const publishAll = (event, context, callback) => {
    const job = event["CodePipeline.job"];    
    assert(job,"CodePipeline Job is required but not found.");

    const {id:jobId} = job;
    console.log("=== ES6 101 ===");
    const data = event["CodePipeline.job"].data;
    const inputArtifacts = data.inputArtifacts;
    const artCreds = data.artifactCredentials;
    const artKey = artCreds.accessKeyId;
    const artSec = artCreds.secretAccessKey;
    const artTok = artCreds.sessionToken;

    const publish = function(art){
      console.log(`== ${art.name} ==`);
      let s3loc = art.location.s3Location;
      let bucketName = s3loc.bucketName;
      let objectKey = s3loc.objectKey;

      const s3In = new AWS.S3({
        accessKeyId: artKey,
        secretAccessKey: artSec,
        sessionToken: artTok,
        signatureVersion: "v4"
      });

      const s3Out = new AWS.S3();

      s3In.getObject({
        Bucket: bucketName,
        Key: objectKey
      },function(err,data){
        if (err) console.log(err, err.stack);
        else {
          console.log(`Received [${data.ContentLength}] bytes`)
          let body = data.Body;
          let zip = new AdmZip(body);
          let entries = zip.getEntries();
          console.log(`Extracting [${entries.length}] entries`);
          entries.forEach(function(entry) {
              let entryName = entry.entryName;
              let keyName = entryName.replace(prefixRex,'');
              let decompressed = zip.readFile(entry);
              let contentType = mime.lookup(entry.name);
              
              s3Out.putObject({
                Bucket: outBucket,
                Key: keyName,
                Body: decompressed,
                ContentType: contentType,
                ACL: 'public-read'
              },function(err,data){
                if (err) console.log(err, err.stack);
                else     console.log(`Put OK s3://${outBucket}/${keyName} as [${contentType}]`)
              });
          });
        }
      });

    };
    inputArtifacts.forEach(publish);

    let eventStr   = JSON.stringify(event);
    let contextStr = JSON.stringify(context);
    console.log(eventStr);
    console.log("===");
    console.log(contextStr);
    setTimeout(function(){
      callback(null,"function finished");
    },2500);

    return;
    /*
    var putJobSuccess = function(message) {
        var params = {
            jobId: jobId
        };
        codepipeline.putJobSuccessResult(params, function(err, data) {
            if(err) {
                context.fail(err);
            } else {
                context.succeed(message);
            }
        });

    };
    if (jobId) putJobSuccess("LambdaFunctionsReleaseToS3 completed OK!");
    */
}; 

module.exports.publishToS3 = publishAll;