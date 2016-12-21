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

function publishAll(event, context, callback){
  console.log("PublishToS3 started");
  const job = event["CodePipeline.job"];
  assert(job,"CodePipeline Job is required but not found.");

  const {id:jobId, data:data} = job;
  const {inputArtifacts, artifactCredentials:artCreds} = data;  
  const {
    accessKeyId:artKey,
    secretAccessKey:artSec,
    sessionToken:artTok
  }  = artCreds;
  
  const s3In = new AWS.S3({
        accessKeyId: artKey,
        secretAccessKey: artSec,
        sessionToken: artTok,
        signatureVersion: "v4"
  });
  const s3Out = new AWS.S3();

  function publishOne(art){
    console.log(`Publishing ${art.name}`);
    let s3loc = art.location.s3Location;
    let { bucketName, objectKey } = s3loc;

    function extractAndPut(err,data){
        if (err) console.log(err, err.stack);
        else {
          console.log(`ZIP artifact is [${data.ContentLength}] bytes`)
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
                else console.log(`Put s3://${outBucket}/${keyName} as [${contentType}]`);
              });
          });
        }
      }

    s3In.getObject({
        Bucket: bucketName,
        Key: objectKey
      },extractAndPut);
  }  

  inputArtifacts.forEach(publishOne);

  let eventStr   = JSON.stringify(event);
  let contextStr = JSON.stringify(context);
  console.log(eventStr);
  console.log("===");
  console.log(contextStr);
  console.log("===");
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

module.exports.publishToS3 = publishAll;