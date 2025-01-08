import { server } from "./server";

export default function testrunner(config: EntrypointConfig) {
    server(config).then(s => s.listen(6002));
}
