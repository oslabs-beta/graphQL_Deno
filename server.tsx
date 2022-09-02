//using Oak a middleware framework for Deno
import { Application, Context, Router } from 'https://deno.land/x/oak/mod.ts';
import { Client } from 'https://deno.land/x/postgres@v0.16.1/mod.ts';
import { redis } from './server/redis.ts';
import { applyGraphQL, gql } from 'https://deno.land/x/oak_graphql/mod.ts';
import { typeDefs, resolvers, usePlayground } from './server/graphql.ts';
import staticFiles from 'https://deno.land/x/static_files@1.1.6/mod.ts';
import ReactDOMServer from 'https://esm.sh/react-dom@18.2.0/server';
import App from './client/App.tsx';
import { React } from './deps.ts';
// import './client/client.tsx';
import { emit } from 'https://deno.land/x/emit@0.8.0/mod.ts';

const app = new Application();
const router = new Router();
const PORT = 3000;

interface ApplyGraphQLOptions<T> {
  context?: (ctx: any) => any;
  path?: string;
  resolvers: ResolversProps;
  Router: Constructable<T>;
  settings?: ISettings;
  typeDefs: any;
  usePlayground?: boolean;
}

const GraphQLService = await applyGraphQL<Router>({
  Router,
  typeDefs,
  resolvers,
  usePlayground,
  context: (ctx) => {},
});

const jsBundle = '/main.js';
//"https://jspm.dev/react@16.13.1" react "https://jspm.dev/react-dom@16.13.1" reactDOM
const js = `import React from "https://esm.sh/react@18.2.0";
 import ReactDOM from "https://esm.sh/react-dom@18.2.0";
 const App = ${App};
 ReactDOM.hydrate(React.createElement(App), document.getElementById('app'));`;

const html = `<html>
    <head>
      <link rel="stylesheet" type="text/css" href="/static/style.css">
      </head>
      <body>
      <div id="app">${ReactDOMServer.renderToReadableStream(<App />)}</div>  
      <script type="module" src="${jsBundle}"></script>
    </body>
  </html>`;

router
  .get('/', (context: Context) => {
    context.response.type = 'text/html';
    context.response.body = html;
  })
  .get(jsBundle, (context: Context) => {
    context.response.type = 'application/javascript';
    context.response.body = js;
  });

app.use(staticFiles('/client/'));
app.use(router.routes());
app.use(router.allowedMethods());
app.use(GraphQLService.routes(), GraphQLService.allowedMethods());

app.addEventListener('listen', ({ secure, hostname, port }) => {
  const protocol = secure ? 'https://' : 'http://';
  const url = `${protocol}${hostname ?? 'localhost'}: ${port}`;
  console.log(`Listening on: ${port}`);
});

console.log(await redis.ping());

const databaseURL =
  'postgres://cdfnqalb:5M9CGQwdkSUEnyyRy7xTU5tixqFkVDaH@drona.db.elephantsql.com/cdfnqalb';
const client = new Client(databaseURL);
await client.connect();

await app.listen({ port: PORT });

export { client };