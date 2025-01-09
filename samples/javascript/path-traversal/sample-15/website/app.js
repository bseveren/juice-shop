        return {err: 'URL must be included in the currently configured list of the allowed scripts:<li>' + JSON.stringify(ALLOWED_SCRIPTS_KEYS) + '</li><li>You can change that by running this <a href="https://github.com/***/debug-tracker/tree/master/website"> project locally </a></li>', url: null};
    }
    try {
        url = decodeURIComponent(url);
        if (!url.startsWith('https://')) {
            return {err: 'URL must start with "https://"', url: null};
        }
    } catch (err) {
        return {err: err.message, url: null};
    }
    return {err: null, url: url}
}

async function fetchURL(url) {
    if (ALLOWED_SCRIPTS_CACHE[url]) return ALLOWED_SCRIPTS_CACHE[url];
    console.log(url);
    try {
        const response = await fetch(url, {timeout: 3000, size: 30000});
        const contentType = response.headers.get('content-type');
        if (!contentType.startsWith('text/javascript')) {
            // return {err: `resource not with correct content type (expected "text/javascript" , received: ${contentType}`, data: null};
        }
        const text = await response.text();
        ALLOWED_SCRIPTS_CACHE[url] = text;
        return {err: null, data: text};
    } catch (err) {
        return {err: err.message, data: null};
    }

}

function generateResponse(data = '') {
    const html = htmlContent.toString();
    const res = html.split('{{ DATA }}').join(data);
    return res;
}

function generateErrorResponse(data = '', name = '') {
    const html = errorContent.toString();
    const res = html.split('{{ NAME }}').join(name.substr(0, 1000));
    const res1 = res.split('{{ ERROR }}').join(data.substr(0, 1000));
    return res1;
}

function generateSuccessResponse(name = '', code = '') {
    const html = successContent.toString();
    const res = html.split('{{ NAME }}').join(name);
    const res2 = res.split('{{ CODE }}').join(code);
    const res3 = res2.split('{{ CODE_B64 }}').join(Buffer.from(code).toString('base64'));
    return res3;
}

function build(name, js) {
    try {
        js =
`
/*

step in / out / over any function you want starting at this point
at the end of execution, you will be presented with the debugging flow you had!

*/
debugger;
${js}
/*

now step over the following line in order to be presented with the debugging flow you had

*/
done();
`;
        const code = track(js, function (info) {
            let function_name, first_timestamp, function_arguments;
            ({function_name, first_timestamp, last_timestamp, function_arguments} = info);
            top._callstack = top._callstack || [];
            top._argsstack = top._argsstack || [];
            function_name += '-' + (+first_timestamp) + '-' + (+last_timestamp);
            top._callstack.push(function_name);
            top._argsstack.push(function_arguments);
        });
        return {err: null, data: generateSuccessResponse(name, code)};
    } catch (err) {
        return {err: err.message, data: null};
    }
}

const app = express();
const port = 8080;

app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'favicon.png'));
});

app.get('/', async (req, res) => {
    // if (req.query.TEMP_SECRET_DONT_TELL !== 'anonymizedSecret') return res.send('OPENING_SOON!');
    let err, data, url;
    if (!req.query.url) {
        return res.send(generateResponse(''));
    }
    ({err, url} = validateURL(req.query.url));
    if (err) {
        const errCode = generateErrorResponse(err, req.query.url);
        return res.send(generateResponse(errCode));
    }
    ({err, data} = await fetchURL(url));
    if (err) {
        const errCode = generateErrorResponse(err, url);
        return res.send(generateResponse(errCode));
    }

    ({err, data} = build(url, data));
    if (err) {
        const errCode = generateErrorResponse(err, url);
        return res.send(generateResponse(errCode));
    }

    return res.send(generateResponse(data));
});