'use strict';

var AWS = require('aws-sdk');
var assert = require('assert');
var AdmZip = require('adm-zip');
var mime = require('mime-types');

var prefixRex = /^breakless\-react\/build\//;

var outBucket = "breakless.bike";
var outRegion = "us-east-1";
var codepipeline = new AWS.CodePipeline();

var publishAll = function publishAll(event, context, callback) {
  var job = event["CodePipeline.job"];
  assert(job, "CodePipeline Job is required but not found.");

  var jobId = job.id,
      data = job.data;

  console.log("=== ES6 FTW ===");

  var inputArtifacts = data.inputArtifacts;
  var artCreds = data.artifactCredentials;
  var artKey = artCreds.accessKeyId;
  var artSec = artCreds.secretAccessKey;
  var artTok = artCreds.sessionToken;

  var publish = function publish(art) {
    console.log('== ' + art.name + ' ==');
    var s3loc = art.location.s3Location;
    var bucketName = s3loc.bucketName;
    var objectKey = s3loc.objectKey;

    var s3In = new AWS.S3({
      accessKeyId: artKey,
      secretAccessKey: artSec,
      sessionToken: artTok,
      signatureVersion: "v4"
    });

    var s3Out = new AWS.S3();

    s3In.getObject({
      Bucket: bucketName,
      Key: objectKey
    }, function (err, data) {
      if (err) console.log(err, err.stack);else {
        (function () {
          console.log('Received [' + data.ContentLength + '] bytes');
          var body = data.Body;
          var zip = new AdmZip(body);
          var entries = zip.getEntries();
          console.log('Extracting [' + entries.length + '] entries');
          entries.forEach(function (entry) {
            var entryName = entry.entryName;
            var keyName = entryName.replace(prefixRex, '');
            var decompressed = zip.readFile(entry);
            var contentType = mime.lookup(entry.name);

            s3Out.putObject({
              Bucket: outBucket,
              Key: keyName,
              Body: decompressed,
              ContentType: contentType,
              ACL: 'public-read'
            }, function (err, data) {
              if (err) console.log(err, err.stack);else console.log('Put s3://' + outBucket + '/' + keyName + ' as [' + contentType + ']');
            });
          });
        })();
      }
    });
  };
  inputArtifacts.forEach(publish);

  var eventStr = JSON.stringify(event);
  var contextStr = JSON.stringify(context);
  console.log(eventStr);
  console.log("===");
  console.log(contextStr);
  setTimeout(function () {
    callback(null, "function finished");
  }, 2500);

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