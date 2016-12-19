'use strict';
var AWS = require('aws-sdk');

module.exports.publishToS3 = (event, context, callback) => {
    let codepipeline = new AWS.CodePipeline();
    let job = event["CodePipeline.job"] || {};
    let jobId = job.id;
    let eventStr = JSON.stringify(event);
    console.log(eventStr);
    console.log(context);

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
