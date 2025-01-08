class HttpClient {
    constructor(subscriptionId, resourceGroupName, serviceName, tenantId, servicePrincipal, secret) {
        this.subscriptionId = subscriptionId;
        this.resourceGroupName = resourceGroupName;
        this.serviceName = serviceName;
        this.baseUrl = `https://${managementApiEndpoint}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.ApiManagement/service/${serviceName}`;
        this.accessToken = this.getAccessToken(tenantId, servicePrincipal, secret);
    }

    /**
     * A wrapper for making a request and returning its response body.
     * @param {string} method - Http method, e.g. GET.
     * @param {string} url - Relative resource URL, e.g. `/contentTypes`.
     * @param {string} body - Request body.
     */
    async sendRequest(method, url, body) {
        let requestUrl;
        let requestBody;

        if (url.startsWith("https://")) {
            requestUrl = new URL(url);
        } else {
            const normalizedUrl = url.startsWith("/") ? url : `/${url}`;
            requestUrl = new URL(this.baseUrl + normalizedUrl);
        }

        if (!requestUrl.searchParams.has("api-version")) {
            requestUrl.searchParams.append("api-version", apiVersion);
        }

        const headers = {
            "If-Match": "*",
            "Content-Type": "application/json",
            "Authorization": this.accessToken
        };

        if (body) {
            if (!body.properties) {
                body = {
                    properties: body
                }
            }
            requestBody = JSON.stringify(body);
            headers["Content-Length"] = Buffer.byteLength(requestBody);
        }

        const options = {
            port: 443,
            method: method,
            headers: headers
        };

        return new Promise((resolve, reject) => {
            const req = https.request(requestUrl.toString(), options, (resp) => {
                let chunks = [];
                resp.on('data', (chunk) => {
                    chunks.push(chunk);
                });

                resp.on('end', () => {
                    let data = Buffer.concat(chunks).toString('utf8');
                    switch (resp.statusCode) {
                        case 200:
                        case 201:
                        case 202:
                            data.startsWith("{") ? resolve(JSON.parse(data)) : resolve(data);
                            break;
                        case 404:
                            reject({ code: "NotFound", message: `Resource not found: ${requestUrl}` });
                            break;
                        case 401:
                            reject({ code: "Unauthorized", message: `Unauthorized. Make sure you're logged-in with "az login" command before running the script.` });
                            break;
                        case 403:
                            reject({ code: "Forbidden", message: `Looks like you are not allowed to perform this operation. Please check with your administrator.` });
                            break;
                        default:
                            reject({ code: "UnhandledError", message: `Could not complete request to ${requestUrl}. Status: ${resp.statusCode} ${resp.statusMessage}` });
                    }
                });
            });

            req.on('error', (e) => {
                reject(e);
            });

            if (requestBody) {
                req.write(requestBody);
            }

            req.end();
        });
    }

    getAccessToken(tenantId, servicePrincipal, secret) {
        if (tenantId != "" && tenantId != null) {
	        execSync(`az login --service-principal --username ` + servicePrincipal + ` --password ` + secret + ` --tenant ` + tenantId);
        }

        const accessToken = execSync(`az account get-access-token --resource-type arm --output tsv --query accessToken`).toString().trim();
        return `Bearer ${accessToken}`;
    }
