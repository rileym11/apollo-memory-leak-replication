import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Post } from "./Post";
import reportWebVitals from "./reportWebVitals";
import { BrowserRouter, Link, Route, Switch } from "react-router-dom";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { ServerError, createHttpLink, split } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";

const httpUrl = "http://localhost:4000/";
const wsUrl = "ws://localhost:4000/subscriptions";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

export const httpLink = createHttpLink({
  uri: httpUrl,
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: wsUrl,
    connectionParams: {
      // token: TokenCache.getToken(),
    },
  })
);
export const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  wsLink,
  httpLink
);

const apolloClient = new ApolloClient({
  // uri: "",
  link: splitLink,
  cache: new InMemoryCache(),
});

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ApolloProvider client={apolloClient}>
        <nav>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/post">Post</Link>
            </li>
          </ul>
        </nav>

        {/* A <Switch> looks through its children <Route>s and
            renders the first one that matches the current URL. */}
        <Switch>
          <Route exact path="/">
            <div>Home page</div>
          </Route>
          <Route path="/post">
            <Post />
          </Route>
        </Switch>
      </ApolloProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
