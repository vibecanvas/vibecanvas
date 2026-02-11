# oRPC

> Typesafe APIs Made Simple 🪄

Easy to build APIs that are end-to-end type-safe and adhere to OpenAPI standards

## Table of Contents

### Contract First

- [Define Contract](/docs/contract-first/define-contract.md): Learn how to define a contract for contract-first development in oRPC
- [Implement Contract](/docs/contract-first/implement-contract.md): Learn how to implement a contract for contract-first development in oRPC
- [Router to Contract](/docs/contract-first/router-to-contract.md): Learn how to convert a router into a contract, safely export it, and prevent exposing internal details to the client.

### Adapters

- [HTTP](/docs/adapters/http.md): How to use oRPC over HTTP?
- [Websocket](/docs/adapters/websocket.md): How to use oRPC over WebSocket?
- [Message Port](/docs/adapters/message-port.md): Using oRPC with Message Ports
- [Astro Adapter](/docs/adapters/astro.md): Use oRPC inside an Astro project
- [Browser Adapter](/docs/adapters/browser.md): Type-safe communication between browser scripts using Message Port Adapter
- [Electron Adapter](/docs/adapters/electron.md): Use oRPC inside an Electron project
- [Elysia Adapter](/docs/adapters/elysia.md): Use oRPC inside an Elysia project
- [Express.js Adapter](/docs/adapters/express.md): Use oRPC inside an Express.js project
- [Fastify Adapter](/docs/adapters/fastify.md): Use oRPC inside an Fastify project
- [H3 Adapter](/docs/adapters/h3.md): Use oRPC inside an H3 project
- [Hono Adapter](/docs/adapters/hono.md): Use oRPC inside an Hono project
- [Next.js Adapter](/docs/adapters/next.md): Use oRPC inside an Next.js project
- [Nuxt.js Adapter](/docs/adapters/nuxt.md): Use oRPC inside an Nuxt.js project
- [React Native Adapter](/docs/adapters/react-native.md): Use oRPC inside a React Native project
- [Remix Adapter](/docs/adapters/remix.md): Use oRPC inside an Remix project
- [Solid Start Adapter](/docs/adapters/solid-start.md): Use oRPC inside a Solid Start project
- [Svelte Kit Adapter](/docs/adapters/svelte-kit.md): Use oRPC inside an Svelte Kit project
- [TanStack Start Adapter](/docs/adapters/tanstack-start.md): Use oRPC inside a TanStack Start project
- [Web Workers Adapter](/docs/adapters/web-workers.md): Enable type-safe communication with Web Workers using oRPC.
- [Worker Threads Adapter](/docs/adapters/worker-threads.md): Enable type-safe communication between Node.js Worker Threads using oRPC.

### Plugins

- [CORS Plugin](/docs/plugins/cors.md): CORS Plugin for oRPC
- [Request Headers Plugin](/docs/plugins/request-headers.md): Request Headers Plugin for oRPC
- [Response Headers Plugin](/docs/plugins/response-headers.md): Response Headers Plugin for oRPC
- [Request Validation Plugin](/docs/plugins/request-validation.md): A plugin that blocks invalid requests before they reach your server. Especially useful for applications that rely heavily on server-side validation.
- [Response Validation Plugin](/docs/plugins/response-validation.md): A plugin that validates server responses against the contract schema to ensure that the data returned from your server matches the expected types defined in your contract.
- [Hibernation Plugin](/docs/plugins/hibernation.md): A plugin to fully leverage Hibernation APIs for your ORPC server.
- [Dedupe Requests Plugin](/docs/plugins/dedupe-requests.md): Prevents duplicate requests by deduplicating similar ones to reduce server load.
- [Batch Requests Plugin](/docs/plugins/batch-requests.md): A plugin for oRPC to batch requests and responses.
- [Client Retry Plugin](/docs/plugins/client-retry.md): A plugin for oRPC that enables retrying client calls when errors occur.
- [Retry After Plugin](/docs/plugins/retry-after.md): A plugin for oRPC that automatically retries requests based on server Retry-After headers.
- [Rethrow Handler Plugin](/docs/plugins/rethrow-handler.md): A plugin to catch and rethrow specific errors during request handling instead of handling them in the oRPC error flow.
- [Compression Plugin](/docs/plugins/compression.md): A plugin for oRPC that compresses response bodies.
- [Body Limit Plugin](/docs/plugins/body-limit.md): A plugin for oRPC to limit the request body size.
- [Simple CSRF Protection Plugin](/docs/plugins/simple-csrf-protection.md): Add basic Cross-Site Request Forgery (CSRF) protection to your oRPC application. It helps ensure that requests to your procedures originate from JavaScript code, not from other sources like standard HTML forms or direct browser navigation.
- [Strict GET Method Plugin](/docs/plugins/strict-get-method.md): Enhance security by ensuring only procedures explicitly marked to accept `GET` requests can be called using the HTTP `GET` method for RPC Protocol. This helps prevent certain types of Cross-Site Request Forgery (CSRF) attacks.
- [Pino Integration](/docs/integrations/pino.md): Integrate oRPC with Pino for structured logging and request tracking.

### Helpers

- [Base64Url Helpers](/docs/helpers/base64url.md): Functions to encode and decode base64url strings, a URL-safe variant of base64 encoding.
- [Cookie Helpers](/docs/helpers/cookie.md): Functions for managing HTTP cookies in web applications.
- [Encryption Helpers](/docs/helpers/encryption.md): Functions to encrypt and decrypt sensitive data using AES-GCM.
- [Form Data Helpers](/docs/helpers/form-data.md): Utilities for parsing form data and handling validation errors with bracket notation support.
- [Publisher](/docs/helpers/publisher.md): Listen and publish events with resuming support in oRPC
- [Rate Limit](/docs/helpers/ratelimit.md): Rate limiting features for oRPC with multiple adapters support.
- [Signing Helpers](/docs/helpers/signing.md): Functions to cryptographically sign and verify data using HMAC-SHA256.

### Client

- [Server-Side Clients](/docs/client/server-side.md): Call your oRPC procedures in the same environment as your server like native functions.
- [Client-Side Clients](/docs/client/client-side.md): Call your oRPC procedures remotely as if they were local functions.
- [Error Handling in oRPC Clients](/docs/client/error-handling.md): Learn how to handle errors in a type-safe way in oRPC clients.
- [Event Iterator in oRPC Clients](/docs/client/event-iterator.md): Learn how to use event iterators in oRPC clients.
- [RPCLink](/docs/client/rpc-link.md): Details on using RPCLink in oRPC clients.
- [DynamicLink](/docs/client/dynamic-link.md): Dynamically switch between multiple oRPC's links.

### Integrations

- [AI SDK Integration](/docs/integrations/ai-sdk.md): Seamlessly use AI SDK inside your oRPC projects without any extra overhead.
- [Better Auth Integration](/docs/integrations/better-auth.md): Seamlessly use Better Auth inside your oRPC projects without any extra overhead.
- [Durable Iterator Integration](/docs/integrations/durable-iterator.md): Extends Event Iterator with durable event streams, automatic reconnections, and event recovery through a separate streaming service.
- [Hey API Integration](/docs/integrations/hey-api.md): Easily convert a Hey API generated client into an oRPC client to take full advantage of the oRPC ecosystem.
- [OpenTelemetry Integration](/docs/integrations/opentelemetry.md): Seamlessly integrate oRPC with OpenTelemetry for distributed tracing
- [Pinia Colada Integration](/docs/integrations/pinia-colada.md): Seamlessly integrate oRPC with Pinia Colada
- [Pino Integration](/docs/integrations/pino.md): Integrate oRPC with Pino for structured logging and request tracking.
- [React SWR Integration](/docs/integrations/react-swr.md): Integrate oRPC with React SWR for efficient data fetching and caching.
- [Sentry Integration](/docs/integrations/sentry.md): Integrate oRPC with Sentry for error tracking and performance monitoring.
- [Tanstack Query Integration](/docs/integrations/tanstack-query.md): Seamlessly integrate oRPC with Tanstack Query
- [Implement Contract in NestJS](/docs/openapi/integrations/implement-contract-in-nest.md): Seamlessly implement oRPC contracts in your NestJS projects.
- [tRPC Integration](/docs/openapi/integrations/trpc.md): Use oRPC features in your tRPC applications.

#### Tanstack Query (Old)

- [Tanstack Query Integration](/docs/integrations/tanstack-query-old/basic.md): Seamlessly integrate oRPC with Tanstack Query
- [Tanstack Query Integration For React](/docs/integrations/tanstack-query-old/react.md): Seamlessly integrate oRPC with Tanstack Query for React
- [Tanstack Query Integration For Vue](/docs/integrations/tanstack-query-old/vue.md): Seamlessly integrate oRPC with Tanstack Query for Vue
- [Tanstack Query Integration For Solid](/docs/integrations/tanstack-query-old/solid.md): Seamlessly integrate oRPC with Tanstack Query for Solid
- [Tanstack Query Integration For Svelte](/docs/integrations/tanstack-query-old/svelte.md): Seamlessly integrate oRPC with Tanstack Query for Svelte

### Examples

- [OpenAI Streaming Example](/docs/examples/openai-streaming.md): Combine oRPC with the OpenAI Streaming API to build a chatbot

### Best Practices

- [Dedupe Middleware](/docs/best-practices/dedupe-middleware.md): Enhance oRPC middleware performance by avoiding redundant executions.
- [Monorepo Setup](/docs/best-practices/monorepo-setup.md): The most efficient way to set up a monorepo with oRPC
- [No Throw Literal](/docs/best-practices/no-throw-literal.md): Always throw `Error` instances instead of literal values.
- [Optimize Server-Side Rendering (SSR) for Fullstack Frameworks](/docs/best-practices/optimize-ssr.md): Optimize SSR performance in Next.js, SvelteKit, and other frameworks by using oRPC to make direct server-side API calls, avoiding unnecessary network requests.

### Advanced

- [Building Custom Plugins](/docs/advanced/building-custom-plugins.md): Create powerful custom plugins to extend oRPC handlers and links with interceptors.
- [Exceeds the Maximum Length Problem](/docs/advanced/exceeds-the-maximum-length-problem.md): How to address the Exceeds the Maximum Length Problem in oRPC.
- [Extend Body Parser](/docs/advanced/extend-body-parser.md): Extend the body parser for more efficient handling of large payloads, extend the data types.
- [Publish Client to NPM](/docs/advanced/publish-client-to-npm.md): How to publish your oRPC client to NPM for users to consume your APIs as an SDK.
- [RPC JSON Serializer](/docs/advanced/rpc-json-serializer.md): Extend or override the standard RPC JSON serializer.
- [RPC Protocol](/docs/advanced/rpc-protocol.md): Learn about the RPC protocol used by RPCHandler.
- [SuperJson](/docs/advanced/superjson.md): Replace the default oRPC RPC serializer with SuperJson.
- [Testing & Mocking](/docs/advanced/testing-mocking.md): How to test and mock oRPC routers and procedures?
- [Validation Errors](/docs/advanced/validation-errors.md): Learn about oRPC's built-in validation errors and how to customize them.

### Migrations

- [Migrating from tRPC](/docs/migrations/from-trpc.md): A comprehensive guide to migrate your tRPC application to oRPC

### Plugins

- [OpenAPI Reference Plugin (Swagger/Scalar)](/docs/openapi/plugins/openapi-reference.md): A plugin that serves API reference documentation and the OpenAPI specification for your API.
- [Smart Coercion Plugin](/docs/openapi/plugins/smart-coercion.md): Automatically converts input values to match schema types without manually defining coercion logic.
- [Zod Smart Coercion](/docs/openapi/plugins/zod-smart-coercion.md): A refined alternative to `z.coerce` that automatically converts inputs to the expected type without modifying the input schema.

### Client

- [OpenAPILink](/docs/openapi/client/openapi-link.md): Details on using OpenAPILink in oRPC clients.

### Integrations

- [Implement Contract in NestJS](/docs/openapi/integrations/implement-contract-in-nest.md): Seamlessly implement oRPC contracts in your NestJS projects.
- [tRPC Integration](/docs/openapi/integrations/trpc.md): Use oRPC features in your tRPC applications.

### Advanced

- [Customizing Error Response Format](/docs/openapi/advanced/customizing-error-response.md): Learn how to customize the error response format in oRPC OpenAPI to match your application's requirements and improve client compatibility.
- [Disabling Output Validation](/docs/openapi/advanced/disabling-output-validation.md): Learn how to disable output validation in oRPC procedures for improved performance while maintaining OpenAPI specification generation.
- [Expanding Type Support for OpenAPI Link](/docs/openapi/advanced/expanding-type-support-for-openapi-link.md): Learn how to extend OpenAPILink to support additional data types beyond JSON's native capabilities using the Response Validation Plugin and schema coercion.
- [OpenAPI JSON Serializer](/docs/openapi/advanced/openapi-json-serializer.md): Extend or override the standard OpenAPI JSON serializer.
- [Redirect Response](/docs/openapi/advanced/redirect-response.md): Standard HTTP redirect response in oRPC OpenAPI.

### Mini oRPC

- [Overview of Mini oRPC](/learn-and-contribute/mini-orpc/overview.md): A brief introduction to Mini oRPC, a simplified version of oRPC designed for learning purposes.
- [Procedure Builder in Mini oRPC](/learn-and-contribute/mini-orpc/procedure-builder.md): Learn how Mini oRPC's procedure builder provides an excellent developer experience for defining type-safe procedures.
- [Server-side Client in Mini oRPC](/learn-and-contribute/mini-orpc/server-side-client.md): Learn how to turn a procedure into a callable function in Mini oRPC, enabling server-side client functionality.
- [Client-side Client in Mini oRPC](/learn-and-contribute/mini-orpc/client-side-client.md): Learn how to implement remote procedure calls (RPC) on the client side in Mini oRPC.
- [Beyond the Basics of Mini oRPC](/learn-and-contribute/mini-orpc/beyond-the-basics.md): Explore advanced features you can implement in Mini oRPC.

### Other

- [Bracket Notation](/docs/openapi/bracket-notation.md): Represent structured data in limited formats such as URL queries and form data.
- [Comparison](/docs/comparison.md): How is oRPC different from other RPC or REST solutions?
- [Context](/docs/context.md): Understanding context in oRPC
- [Ecosystem](/docs/ecosystem.md): oRPC ecosystem & community resources
- [Error Handling](/docs/error-handling.md): Manage errors in oRPC using both traditional and type‑safe strategies.
- [Event Iterator (SSE)](/docs/event-iterator.md): Learn how to streaming responses, real-time updates, and server-sent events using oRPC.
- [File Upload and Download](/docs/file-upload-download.md): Learn how to upload and download files using oRPC.
- [Getting Started](/docs/getting-started.md): Quick guide to oRPC
- [Getting Started with OpenAPI](/docs/openapi/getting-started.md): Quick guide to OpenAPI in oRPC
- [Input/Output Structure](/docs/openapi/input-output-structure.md): Control how input and output data is structured in oRPC
- [Metadata](/docs/metadata.md): Enhance your procedures with metadata.
- [Middleware](/docs/middleware.md): Understanding middleware in oRPC
- [OpenAPI Error Handling](/docs/openapi/error-handling.md): Handle errors in your OpenAPI-compliant oRPC APIs
- [OpenAPI Handler](/docs/openapi/openapi-handler.md): Comprehensive Guide to the OpenAPIHandler in oRPC
- [OpenAPI Routing](/docs/openapi/routing.md): Configure procedure routing with oRPC.
- [OpenAPI Specification](/docs/openapi/openapi-specification.md): Generate OpenAPI specifications for oRPC with ease.
- [Playgrounds](/docs/playgrounds.md): Interactive development environments for exploring and testing oRPC functionality.
- [Procedure](/docs/procedure.md): Understanding procedures in oRPC
- [Router](/docs/router.md): Understanding routers in oRPC
- [RPC Handler](/docs/rpc-handler.md): Comprehensive Guide to the RPCHandler in oRPC
- [Scalar (Swagger)](/docs/openapi/scalar.md): Create a beautiful API client for your oRPC effortlessly.
- [Server Action](/docs/server-action.md): Integrate oRPC procedures with React Server Actions
