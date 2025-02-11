var https = require('follow-redirects').https;
var fs = require('fs');

var options = {
    'method': 'POST',
    'hostname': 'api.infobip.com',
    'path': '/whatsapp/1/message/template',
    'headers': {
        'Authorization': 'App c903fa714912770c61f1508550abcf19-19cc8e24-4512-4219-bf48-b19b0971456e',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    'maxRedirects': 20
};

var req = https.request(options, function (res) {
    var chunks = [];

    res.on("data", function (chunk) {
        chunks.push(chunk);
    });

    res.on("end", function (chunk) {
        var body = Buffer.concat(chunks);
        console.log(body.toString());
    });

    res.on("error", function (error) {
        console.error(error);
    });
});

var postData = JSON.stringify({
    "messages": [
        {
            "from": "447860099299",
            "to": "9647717512709",
            "messageId": "b89221f2-beda-4347-bbb0-f42a43425ad2",
            "content": {
                "templateName": "test_whatsapp_template_en",
                "templateData": {
                    "body": {
                        "placeholders": ["Suhaibibrahi"]
                    }
                },
                "language": "en"
            }
        }
    ]
});

req.write(postData);

req.end();