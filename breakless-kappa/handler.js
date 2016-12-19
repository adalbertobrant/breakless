'use strict';
const AWS = require('aws-sdk');
const assert = require('assert');
const fs = require('fs');
const unzip = require('unzip');


module.exports.publishToS3 = (event, context, callback) => {
    const codepipeline = new AWS.CodePipeline();
    const job = event["CodePipeline.job"] || {};
    const jobId = job.id;
    assert(jobId,"CodePipeline Job ID is required but not found.");
    console.log("=== 2016-12-19T1526 ===");
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
      console.log("FOIIIIII");

      const s3 = new AWS.S3({
        accessKeyId: artKey,
        secretAccessKey: artSec,
        sessionToken: artTok,
        signatureVersion: "v4"
      });

      s3.getObject({
        Bucket: bucketName,
        Key: objectKey
      }).createReadStream()
        .pipe(unzip.Parse())
        .on('entry', function (entry) {
            var fileName = entry.path;
            var type = entry.type; // 'Directory' or 'File'
            var size = entry.size;
            console.log(`Upload [${fileName}][${type}][${size}] to S3`)
            //entry.pipe(fs.createWriteStream('output/path'));
            entry.autodrain();
          });
    };
    inputArtifacts.forEach(publish);

    let eventStr   = JSON.stringify(event);
    let contextStr = JSON.stringify(context);
    //console.log(eventStr);
    //console.log("===");
    //console.log(contextStr);
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
