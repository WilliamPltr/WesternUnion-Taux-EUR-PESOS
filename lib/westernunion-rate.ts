/**
 * Fetches EUR→ARS using Western Union's public GraphQL router (same as wu.com SPA).
 * Amount is expressed in euro cents on the wire (100 EUR → 10000).
 */

const DEFAULT_ROUTER_URL = "https://www.westernunion.com/router/";
const DEFAULT_ACCESS_CODE = "RtYV3XDz9EA";

const CREATE_SESSION_MUTATION = `
mutation createSession($req: CreateSessionInput) {
  createSession(input: $req) {
    ... on CreateSessionResponse {
      security {
        clientIp
        dataCenter
        session {
          auth
          encryptedSessionId
          id
        }
      }
    }
    ... on ErrorResponse {
      errorCode
      message
      name
    }
  }
}`;

const PRODUCTS_QUERY = `
query products($req_products: ProductsInput) {
  products(input: $req_products) {
    __typename
    ... on ProductsResponse {
      products {
        code
        exchangeRate
        destination {
          expectedPayoutAmount
          currencyIsoCode
          countryIsoCode
        }
      }
    }
    ... on ErrorResponse {
      errorCode
      message
    }
  }
}`;

export type WesternUnionRateResult = {
  /** ARS received per 1 EUR (from WU quote). */
  rate: number;
  /** Send amount in EUR used for the quote. */
  sendAmountEur: number;
};

type GraphQLErrorPayload = { errors?: Array<{ message?: string }> };

function routerUrl(): string {
  return process.env.WU_ROUTER_URL?.trim() || DEFAULT_ROUTER_URL;
}

function accessCode(): string {
  return process.env.WU_ACCESS_CODE?.trim() || DEFAULT_ACCESS_CODE;
}

function randomDeviceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `wu-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function postGraphQL<T>(
  operationName: "createSession" | "products",
  body: Record<string, unknown>,
  headers: Record<string, string>,
): Promise<T & GraphQLErrorPayload> {
  const res = await fetch(routerUrl(), {
    method: "POST",
    redirect: "follow",
    headers: {
      "Content-Type": "application/json",
      "x-wu-operationname": operationName,
      "x-wu-accesscode": accessCode(),
      "User-Agent":
        "Mozilla/5.0 (compatible; WURateCheck/1.0; +https://www.westernunion.com/)",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: T & GraphQLErrorPayload;
  try {
    json = JSON.parse(text) as T & GraphQLErrorPayload;
  } catch {
    throw new Error(
      `Western Union router returned non-JSON (${res.status}): ${text.slice(0, 200)}`,
    );
  }

  if (!res.ok) {
    throw new Error(
      `Western Union router HTTP ${res.status}: ${text.slice(0, 300)}`,
    );
  }

  if (json.errors?.length) {
    throw new Error(
      `Western Union GraphQL: ${json.errors.map((e) => e.message).join("; ")}`,
    );
  }

  return json;
}

type CreateSessionData = {
  data?: {
    createSession?: {
      security?: {
        session?: { id?: string };
      };
    };
  };
};

type ProductsData = {
  data?: {
    products?: {
      __typename?: string;
      products?: Array<{
        exchangeRate?: number;
      }>;
    };
  };
};

/**
 * @param sendAmountEur - Amount in EUR used for the price catalog (default 100).
 */
export async function getWesternUnionEurArsRate(
  sendAmountEur: number = 100,
): Promise<WesternUnionRateResult> {
  if (!Number.isFinite(sendAmountEur) || sendAmountEur <= 0) {
    throw new Error("sendAmountEur must be a positive number");
  }

  const country = process.env.WU_SEND_COUNTRY_CODE?.trim().toUpperCase() || "ES";
  const language = process.env.WU_LANGUAGE_CODE?.trim().toLowerCase() || "es";
  const destCountry =
    process.env.WU_RECEIVE_COUNTRY_CODE?.trim().toUpperCase() || "AR";
  const destCurrency =
    process.env.WU_RECEIVE_CURRENCY_CODE?.trim().toUpperCase() || "ARS";

  const amountCents = Number((100 * sendAmountEur).toFixed(2));

  const sessionHeaders: Record<string, string> = {
    wucountrycode: country,
    wulanguagecode: language,
  };

  const sessionJson = await postGraphQL<CreateSessionData>(
    "createSession",
    {
      query: CREATE_SESSION_MUTATION,
      variables: {
        req: {
          businessMode: "DIGITAL",
          externalReferenceNo: "1",
          locale: {
            countryCode: country,
            languageCode: language,
          },
          security: {
            requestHeader: [{ key: "isRREnabled", value: "false" }],
            blackBoxData: {
              id: "101569194",
              length: "0",
            },
          },
          device: { type: "WEB" },
          channel: {
            type: "WEB",
            name: "Western Union",
            version: "9Z00",
            isResponsive: "true",
            deviceIdentifier: "RESPONSIVE_WEB",
          },
        },
      },
    },
    sessionHeaders,
  );

  const sessionId = sessionJson.data?.createSession?.security?.session?.id;
  if (!sessionId) {
    throw new Error("Western Union createSession did not return a session id");
  }

  const ts = Date.now();
  const deviceId = randomDeviceId();

  const productsHeaders: Record<string, string> = {
    wucountrycode: country,
    wulanguagecode: language,
    "device-id": deviceId,
  };

  const productsJson = await postGraphQL<ProductsData>(
    "products",
    {
      query: PRODUCTS_QUERY,
      variables: {
        req_products: {
          origination: {
            channel: "WWEB",
            client: "WUCOM",
            countryIsoCode: country,
            currencyIsoCode: "EUR",
            eflType: "STATE",
            amount: amountCents,
            fundsIn: "*",
            airRequested: "Y",
          },
          destination: {
            countryIsoCode: destCountry,
            currencyIsoCode: destCurrency,
          },
          language,
          headerRequest: {
            version: "0.5",
            requestType: "PRICECATALOG",
            correlationId: sessionId,
            transactionId: `${sessionId}-${ts}`,
          },
          visit: {
            localDatetime: {
              timeZone: new Date().getTimezoneOffset(),
              timestampMs: ts,
            },
          },
        },
      },
    },
    productsHeaders,
  );

  const products = productsJson.data?.products?.products;
  const first = products?.find((p) => typeof p.exchangeRate === "number");
  const rate = first?.exchangeRate;

  if (typeof rate !== "number" || !Number.isFinite(rate)) {
    throw new Error("Western Union products response did not include exchangeRate");
  }

  return { rate, sendAmountEur };
}
