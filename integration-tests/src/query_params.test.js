// @flow
import * as Recouple from "recouple";
import * as T from "recouple/lib/type_rep";
import * as RecoupleFetch from "recouple-fetch";
import * as RecoupleKoa from "recouple-koa";
import * as TestUtils from "./test_utils";
import fetch from "isomorphic-fetch";
import Koa from "koa";

const testEndpoint: Recouple.Endpoint<
  {
    first: string,
    last: string
  },
  {
    first: string,
    last: string,
    full: string
  }
> = Recouple.endpoint()
  .fragment("foo")
  .queryParams({
    first: T.string,
    last: T.string
  });

const testHandler = jest.fn(async input => {
  return {
    first: input.first,
    last: input.last,
    full: `${input.first} ${input.last}`
  };
});

describe("for a GET endpoint with no parameters", () => {
  it("should be able to generate a server", async () => {
    const server = TestUtils.makeServer({
      endpoint: testEndpoint,
      handler: testHandler
    });
    const resp = await fetch(
      `http://localhost:${server.address().port}/foo?first=First&last=Last`
    );
    const json = await resp.json();
    expect(json).toEqual({ first: "First", last: "Last", full: "First Last" });
  });

  it("should be able to generate a compatible client", async () => {
    const server = TestUtils.makeServer({
      endpoint: testEndpoint,
      handler: testHandler
    });
    const input = { first: "First", last: "Last" };
    const resp = await RecoupleFetch.safeGet(
      `http://localhost:${server.address().port}`,
      testEndpoint,
      input
    );
    expect(resp).toEqual({ first: "First", last: "Last", full: "First Last" });
  });

  test("client does not serialize extraneous query params", async () => {
    const server = TestUtils.makeServer({
      endpoint: testEndpoint,
      handler: testHandler
    });
    const input = {
      first: "First",
      last: "Last",
      extraneous1: "extra",
      extraneous2: "extra"
    };
    const baseURL = `http://localhost:${server.address().port}`;
    await RecoupleFetch.safeGet(baseURL, testEndpoint, input);
    const expectedURL = `${baseURL}/foo?first=First&last=Last`;
    expect(fetch).toHaveBeenLastCalledWith(expectedURL);
  });

  test("server ignores extraneous query params", async () => {
    const server = TestUtils.makeServer({
      endpoint: testEndpoint,
      handler: testHandler
    });
    await fetch(
      `http://localhost:${
        server.address().port
      }/foo?first=First&last=Last&foo=Bar`
    );
    expect(testHandler).toHaveBeenLastCalledWith({
      first: "First",
      last: "Last"
    });
  });

  test("server will parse empty inputs on non-optional parameters as empty strings", async () => {
    const server = TestUtils.makeServer({
      endpoint: testEndpoint,
      handler: testHandler
    });
    const resp = await fetch(
      `http://localhost:${server.address().port}/foo?first=&last=Last`
    );
    await resp.json();
    expect(testHandler).toHaveBeenLastCalledWith({
      first: "",
      last: "Last"
    });
  });
});

const testNumEndpoint: Recouple.Endpoint<
  {
    x: number
  },
  number
> = Recouple.endpoint()
  .fragment("foo")
  .queryParams({
    x: T.number
  });

const testNumHandler = jest.fn(async () => 0);

describe("for a GET endpoint with number query parameters", () => {
  let server;
  beforeEach(() => {
    server = TestUtils.makeServer({
      endpoint: testNumEndpoint,
      handler: testNumHandler
    });
  });

  describe("for the recouple client", () => {
    it("can be called with a query parameter", async () => {
      const baseURL = `http://localhost:${server.address().port}`;
      const input = { x: 47 };
      await RecoupleFetch.safeGet(baseURL, testNumEndpoint, input);
      const expectedURL = `${baseURL}/foo?x=47`;
      expect(fetch).toHaveBeenLastCalledWith(expectedURL);
    });
  });

  describe("for the recouple server", () => {
    it("can be called with a query parameter", async () => {
      const resp = await fetch(
        `http://localhost:${server.address().port}/foo?x=47`
      );
      await resp.json();
      expect(testNumHandler).toHaveBeenLastCalledWith({ x: 47 });
    });
  });
});

const testOptionalEndpoint: Recouple.Endpoint<
  {
    x: ?string,
    y: string
  },
  string
> = Recouple.endpoint()
  .fragment("foo")
  .queryParams({
    x: T.option(T.string),
    y: T.string
  });

const testOptionalHandler = jest.fn(async () => {
  return "foo";
});

describe("for a GET endpoint with optional query parameters", () => {
  let server;
  beforeEach(() => {
    server = TestUtils.makeServer({
      endpoint: testOptionalEndpoint,
      handler: testOptionalHandler
    });
  });
  describe("for the recouple client", () => {
    it("can be called with a query parameter", async () => {
      const baseURL = `http://localhost:${server.address().port}`;
      const input = { x: "X", y: "Y" };
      await RecoupleFetch.safeGet(baseURL, testOptionalEndpoint, input);
      const expectedURL = `${baseURL}/foo?x=X&y=Y`;
      expect(fetch).toHaveBeenLastCalledWith(expectedURL);
    });

    describe("for null parameters", () => {
      it("will strip null parameters from the query string", async () => {
        const baseURL = `http://localhost:${server.address().port}`;
        const input = { x: null, y: "Y" };
        await RecoupleFetch.safeGet(baseURL, testOptionalEndpoint, input);
        const expectedURL = `${baseURL}/foo?y=Y`;
        expect(fetch).toHaveBeenLastCalledWith(expectedURL);
      });

      it("will strip undefined parameters from the query string", async () => {
        const baseURL = `http://localhost:${server.address().port}`;
        const input = { x: undefined, y: "Y" };
        await RecoupleFetch.safeGet(baseURL, testOptionalEndpoint, input);
        const expectedURL = `${baseURL}/foo?y=Y`;
        expect(fetch).toHaveBeenLastCalledWith(expectedURL);
      });

      it("will serialize empty string parameters to empty strings", async () => {
        const baseURL = `http://localhost:${server.address().port}`;
        const input = { x: "", y: "Y" };
        await RecoupleFetch.safeGet(baseURL, testOptionalEndpoint, input);
        const expectedURL = `${baseURL}/foo?x=&y=Y`;
        expect(fetch).toHaveBeenLastCalledWith(expectedURL);
      });
    });
  });

  describe("for the recouple server", () => {
    test("server can parse the input when present", async () => {
      const resp = await fetch(
        `http://localhost:${server.address().port}/foo?x=X&y=Y`
      );
      await resp.json();
      expect(testOptionalHandler).toHaveBeenLastCalledWith({ x: "X", y: "Y" });
    });

    test("server will parse absent optional inputs as undefined", async () => {
      const resp = await fetch(
        `http://localhost:${server.address().port}/foo?y=Y`
      );
      await resp.json();
      expect(testOptionalHandler).toHaveBeenLastCalledWith({
        x: undefined,
        y: "Y"
      });
    });

    test("server will parse empty inputs on optional parameters as empty", async () => {
      const resp = await fetch(
        `http://localhost:${server.address().port}/foo?x=&y=Y`
      );
      await resp.json();
      expect(testOptionalHandler).toHaveBeenLastCalledWith({ x: "", y: "Y" });
    });
  });
});

// RecoupleKoa type tests
() => {
  const app = new Koa();

  // it permits correct output types in handlers
  // ok
  app.use(
    RecoupleKoa.safeGet(testEndpoint, async () => ({
      first: "",
      last: "",
      full: ""
    }))
  );

  // it rejects invalid output types in handlers
  app.use(
    // $FlowFixMe
    RecoupleKoa.safeGet(testEndpoint, async () => ({ first: "", last: "" }))
  );

  // it permits correct input types in handlers
  app.use(
    RecoupleKoa.safeGet(testEndpoint, async input => {
      // ok
      (input: { first: string, last: string });
      return { first: "", last: "", full: "" };
    })
  );

  // it rejects invalid input types in handlers
  app.use(
    RecoupleKoa.safeGet(testEndpoint, async input => {
      // $FlowFixMe
      (input: { first: string, last: string, asdf: number });
      return { first: "", last: "", full: "" };
    })
  );
};

// RecoupleFetch type tests
() => {
  const baseURL = "http://localhost:8080";

  // it permits correct output types in handlers
  // ok
  (RecoupleFetch.safeGet(baseURL, testEndpoint, {
    first: "",
    last: ""
  }): Promise<{
    first: string,
    last: string,
    full: string
  }>);

  // it rejects invalid output types in handlers
  (RecoupleFetch.safeGet(baseURL, testEndpoint, {
    first: "",
    last: ""
    // $FlowFixMe
  }): Promise<{
    first: string,
    last: string,
    NotFull: number
  }>);

  // it permits correct input types in handlers
  // ok
  RecoupleFetch.safeGet(baseURL, testEndpoint, { first: "", last: "" });
};
