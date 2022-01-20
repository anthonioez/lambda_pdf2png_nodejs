const fs        = require("fs")
const gm        = require("gm").subClass({imageMagick: true});
const aws       = require('aws-sdk');
const async     = require('async');

const {config}  = require('./config.js')

exports.handler = (event, context, callback) => {

    console.log('handler:', event)

    downloadBuffer(event.inbucket, event.inkey, function(err, data)
    {
        if(err)
        {
            callback(new Error(err));
        }
        else
        {
            var filepath = "/tmp/input.pdf";
            
            try
            {
                console.log('pdf2png buff: ', data.Body.length)

                gm(data.Body).identify("%p ", function(error, identity)    
                {
                    console.log('pdf2png identify:', error, identity)
    
                    if (error) 
                    {
                        callback(new Error(error));
                    }
                    else
                    {
                        console.log('pdf2png buff: ', data.Body.length)

                        var filestream = fs.createWriteStream(filepath);
                        filestream.write(data.Body);
                        filestream.end();

                        console.log('pdf2png file: ', filepath, fileSize(filepath))
                        
                        var pagelist = identity.split(' ') 
                        var pagecount = pagelist.length;
                        var results = [];

                        console.log('pdf2png info:', pagecount, ' ', pagelist)

                        async.eachSeries(pagelist, function(page, callbackSeries)
                        {
                            console.log('pdf2png processing:', page + '/' + pagecount)

                            gm(filepath + '[' + page + ']')                        
                            .density(320, 320)
                            .background('white')
                            .flatten()
                            .quality(100)   
                            .toBuffer('png', function(err, buffer) 
                            {
                                console.log('pdf2png output:', err, buffer)
    
                                if (err) 
                                {
                                    callbackSeries(new Error(err));
                                } 
                                else 
                                {                                           
                                    var filename = event.outkey + page + '.png'; 

                                    uploadBuffer(buffer, event.outbucket, filename, function(err, data)
                                    {
                                        if(err)
                                        {
                                            callbackSeries(new Error(err));
                                        }
                                        else
                                        {
                                            results.push(filename);

                                            callbackSeries(null);           
                                        }
                                    })
                                }
                            });  
                        },
                        function(err)
                        {
                            if(fs.existsSync(filepath)) fs.unlinkSync(filepath);
                                                        
                            console.log('pdf2png results:', results);

                            if(err)
                                callback(err);       
                            else
                                callback(null, results)
                        });
                        return
                    }     
                })        
                if(fs.existsSync(filepath)) fs.unlinkSync(filepath);                            
            }
            catch(err)
            {
                if(fs.existsSync(filepath)) fs.unlinkSync(filepath);                

                console.log('pdf2png exception:', data)

                callback(new Error(err));
            }
        }
    });
}

function downloadBuffer(bucket, key, callback)
{
    aws.config.update({accessKeyId: config.awsKey, secretAccessKey: config.awsSecret});
    aws.config.region = config.awsRegion;
    
    var s3 = new aws.S3(); 
    
    const params = {
        Bucket: bucket,
        Key: key, 
    };
    
    console.log("downloadBuffer: ", bucket, key);

    s3.getObject(params, function(err, data)
    {
        if (err) 
        {
            console.log("downloadBuffer err: ", err);
            
            if(callback) callback(err);   
        }
        else
        {
            console.log("downloadBuffer ok: ", data.ETag);

            if(callback) callback(false, data);   
        }
    })
}

function uploadBuffer(data, bucket, key, callback)
{        
    aws.config.update({accessKeyId: config.awsKey, secretAccessKey: config.awsSecret});
    aws.config.region = config.awsRegion;
    
    var s3 = new aws.S3(); 
    
    const params = {
        ACL: 'public-read',
        ContentType: 'application/octet-stream',
        Bucket: bucket,
        Key: key, 
        Body: data 
    };
    
    console.log("uploadBuffer: ", bucket, key);

    s3.putObject(params, function(err, data) 
    {   
        if (err) 
        {   
            console.log("uploadBuffer err: ", err);

            if(callback) callback(err);   
        } 
        else 
        {   
            console.log("uploadBuffer ok: ", data);

            if(callback) callback(false, data);
        }   
    });                 
}

function fileSize(p)
{
    if(fs.existsSync(p)) 
    { 
        return fs.lstatSync(p).size; 
    } 
    return false; 
}