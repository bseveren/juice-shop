import ensureSecure from "./ensure-secure";

import filters from "./middleware/filters";
import * as csp from "./utils/csp";

const HTMLPATH = path.resolve(__dirname, "../..", "client", "dist");
const HTMLPATH_PUBLIC = path.resolve(__dirname, "../..", "client", "public");

const app: Express = express();

if (process.env.NODE_ENV !== "production") {
    app.use(morgan("dev"));
}

let dsnSentry =
    "https://foo@bar.com/5964321";
if (process.env.NODE_ENV == "production") {
    dsnSentry =
        "https://foo@bar.com/5964049";
}

initSentry({
    dsn: dsnSentry,
});

// Sentry request handler - should be the first middleware of the app
app.use(SentryHandlers.requestHandler());

app.use(
    helmet({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                defaultSrc: csp.selfSrc,
                childSrc: csp.childSrc,
                fontSrc: csp.fontSrc,
                formAction: csp.formAction,
                mediaSrc: csp.mediaSrc,
                connectSrc: csp.connectSrc,
                frameSrc: csp.frameSrc,
                styleSrc: csp.styleSrc,
                scriptSrc: csp.scriptSrc,
                scriptSrcElem: csp.scriptSrc,
                imgSrc: csp.imgSrc,
            },
        },
    })
);

const corsOptions: cors.CorsOptions = {
    origin: [
        "http://localhost:8081",
        "http://localhost:8083",
    ],
};

app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(express.json());

// Enable file uploads
app.use(
    fileUpload({
        useTempFiles: true,
        safeFileNames: true,
        preserveExtension: 4,
    })
);

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// clean unset query parameters (set 'null' and 'undefined' to null)
app.use(cleanQuery);

// Read filters if there are any in the query
app.use(filters);

// Add controllers
app.use("/api", routerOpenAPI);

// eslint-disable-next-line @typescript-eslint/no-misused-promises
app.use("/api", auth.checkJwt, auth.populate, checkReadOnly, router);

// The error handler must be before any other error middleware and after all controllers
app.use(SentryHandlers.errorHandler());

// Optional fallthrough error handler
app.use(function onError(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) {
    // The error id is attached to `res.sentry` to be returned
    // and optionally displayed to the user for support.
    console.log(err);
    res.sendStatus(500);
});

if (process.env.NODE_ENV === "production") {
    app.use("*", ensureSecure);
}
