'use strict';
const AWS = require('aws-sdk');
const assert = require('assert');

module.exports.publishToS3 = (event, context, callback) => {
    let codepipeline = new AWS.CodePipeline();
    let job = event["CodePipeline.job"] || {};
    let jobId = job.id;
    assert(jobId,"CodePipeline Job ID is required but not found.");
    let eventStr   = JSON.stringify(event);
    let contextStr = JSON.stringify(context);
    console.log(eventStr);
    console.log("===");
    console.log(contextStr);

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
};
