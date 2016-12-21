'use strict';
const AWS = require('aws-sdk');
const assert = require('assert');
const fs = require('fs');
const AdmZip = require('adm-zip');

const prefixRex = /^breakless\-react\/build\//;

const outBucket = "breakless.bike";
const outRegion = "us-east-1";
const codepipeline = new AWS.CodePipeline();

function publishAllArtifacts(job){
  console.log("XXX")
  console.log(job)
  assert(job,"CodePipeline Job is required but not found.");
  const { id:jobId, data } = job;
  console.log(`Publishing artifacts for job [${jobId}]`)
  const { inputArtifacts, artifactCredentials} = data;
  const { accessKeyId, secretAccessKey, sessionToken} = artifactCredentials;
  const s3In = new AWS.S3({
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
    sessionToken: sessionToken,
    signatureVersion: "v4"
  });
  const s3Out = new AWS.S3();

  function publish(art){
      console.log(`Publishing ${art.name}`);
      let s3loc = art.location.s3Location;
      let {bucketName, objectKey}  = s3loc;

      function extractAndPut(err,data){
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
              let body = entry.data
              console.log(`Put s3://${outBucket}/${keyName}`)
              s3Out.putObject({
                Bucket: outBucket,
                Key: keyName,
                Body: body,
              },function(err,data){
                if (err) console.log(err, err.stack);
                else     console.log(`OK [${keyName}]`);
              });
          });
        }
      }
      s3In.getObject({
        Bucket: bucketName,
        Key: objectKey
      },extractAndPut);
  }
  inputArtifacts.forEach(publish);
}

module.exports.publishToS3 = (event, context, callback) => {
    console.log("publishToS3 started");
    const job   = event["CodePipeline.job"];
    publishAllArtifacts(job);

    let eventStr   = JSON.stringify(event);
    let contextStr = JSON.stringify(context);
    console.log("= EVENT =");
    console.log(eventStr);
    console.log("= CONTEXT =");
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
