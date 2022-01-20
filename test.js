const aws       = require('aws-sdk');

const {config}  = require('./config.js')

aws.config.update({accessKeyId: config.awsKey, secretAccessKey: config.awsSecret});
aws.config.region = config.awsRegion;

var payload = {
    'inbucket':     'testbucket',
    'inkey':        'pdfpng/input.pdf',
    'outbucket':    'testbucket', 
    'outkey':       'pdfpng/pngout/'
};

var lambda = new aws.Lambda();
var request = 
{
    Payload: JSON.stringify(payload),
    FunctionName: 'pdf2png',
    InvocationType: 'RequestResponse',
};

lambda.invoke(request, function(err, response) 
{
    console.log('lambda: ', err, response)    
});