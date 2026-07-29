#!/usr/bin/env node

const baseUrl = (process.env.J2_BASE_URL ?? 'https://seraya-delta.vercel.app').replace(/\/+$/, '');
const genericOnly = process.argv.includes('--generic-only');

const fixtures = [
  {
    coupleNames: ['Mira', 'Arga'],
    guestName: 'Tamu Audit Roselle',
    partySize: 2,
    rsvpStatusLabel: 'Belum merespons',
    slug: 'seraya-evidence-roselle',
    templateKey: 'roselle',
    tokenEnv: 'J2_ROSELLE_GUEST_TOKEN',
  },
  {
    coupleNames: ['Nadia', 'Raka'],
    guestName: 'Tamu Audit Aruna',
    partySize: 2,
    rsvpStatusLabel: 'Belum merespons',
    slug: 'seraya-evidence-aruna',
    templateKey: 'aruna',
    tokenEnv: 'J2_ARUNA_GUEST_TOKEN',
  },
  {
    coupleNames: ['Alya', 'Dimas'],
    guestName: 'Tamu Audit Laras',
    partySize: 2,
    rsvpStatusLabel: 'Belum merespons',
    slug: 'seraya-evidence-laras',
    templateKey: 'laras',
    tokenEnv: 'J2_LARAS_GUEST_TOKEN',
  },
];

function assertEvidence(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchPage(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Seraya-J2-Production-Evidence/1.0',
    },
    redirect: 'follow',
  });
  const body = await response.text();

  return { body, response };
}

function assertTemplateSurface(body, fixture, surface) {
  assertEvidence(
    body.includes(`data-surface="${surface}"`),
    `${fixture.templateKey} ${surface}: expected surface marker`,
  );
  assertEvidence(
    body.includes(`data-template="${fixture.templateKey}"`),
    `${fixture.templateKey} ${surface}: expected template marker`,
  );

  for (const name of fixture.coupleNames) {
    assertEvidence(
      body.includes(name),
      `${fixture.templateKey} ${surface}: expected couple name ${name}`,
    );
  }
}

async function verifyGeneric(fixture) {
  const url = `${baseUrl}/${fixture.slug}`;
  const { body, response } = await fetchPage(url);

  assertEvidence(
    response.status === 200,
    `${fixture.templateKey} generic: HTTP ${response.status}`,
  );
  assertTemplateSurface(body, fixture, 'generic');
  assertEvidence(
    body.includes('data-generic-response-note'),
    `${fixture.templateKey} generic: missing response handoff note`,
  );

  for (const privateMarker of [
    'data-template-personal-greeting',
    'data-template-response-journey',
    'data-personal-guest-rsvp',
    'data-personal-guestbook',
  ]) {
    assertEvidence(
      !body.includes(privateMarker),
      `${fixture.templateKey} generic: leaked ${privateMarker}`,
    );
  }

  return {
    status: 'PASS',
    statusCode: response.status,
    surface: 'generic',
    templateKey: fixture.templateKey,
    url,
  };
}

async function verifyPersonal(fixture, token) {
  const url = `${baseUrl}/${fixture.slug}/g/${encodeURIComponent(token)}`;
  const { body, response } = await fetchPage(url);

  assertEvidence(
    response.status === 200,
    `${fixture.templateKey} personal: HTTP ${response.status}`,
  );
  assertTemplateSurface(body, fixture, 'personal');
  assertEvidence(
    body.includes(fixture.guestName),
    `${fixture.templateKey} personal: missing guest greeting`,
  );

  for (const personalMarker of [
    'data-template-personal-greeting',
    'data-template-response-journey',
    'data-personal-guest-rsvp',
    'data-personal-guestbook',
  ]) {
    assertEvidence(
      body.includes(personalMarker),
      `${fixture.templateKey} personal: missing ${personalMarker}`,
    );
  }

  assertEvidence(
    body.includes(`Undangan ini berlaku untuk maksimal ${fixture.partySize} orang.`),
    `${fixture.templateKey} personal: expected party size ${fixture.partySize}`,
  );
  assertEvidence(
    body.includes(fixture.rsvpStatusLabel),
    `${fixture.templateKey} personal: expected RSVP status ${fixture.rsvpStatusLabel}`,
  );
  assertEvidence(
    !body.includes('data-generic-response-note'),
    `${fixture.templateKey} personal: generic response note must be absent`,
  );

  const cacheControl = response.headers.get('cache-control') ?? '';
  const robotsTag = response.headers.get('x-robots-tag') ?? '';
  const referrerPolicy = response.headers.get('referrer-policy') ?? '';
  const contentTypeOptions = response.headers.get('x-content-type-options') ?? '';

  assertEvidence(
    cacheControl.includes('no-store'),
    `${fixture.templateKey} personal: no-store missing`,
  );
  assertEvidence(robotsTag.includes('noindex'), `${fixture.templateKey} personal: noindex missing`);
  assertEvidence(
    referrerPolicy.toLowerCase() === 'no-referrer',
    `${fixture.templateKey} personal: no-referrer missing`,
  );
  assertEvidence(
    contentTypeOptions.toLowerCase() === 'nosniff',
    `${fixture.templateKey} personal: nosniff missing`,
  );

  return {
    cacheControl,
    partySize: fixture.partySize,
    referrerPolicy,
    robotsTag,
    rsvpStatus: fixture.rsvpStatusLabel,
    status: 'PASS',
    statusCode: response.status,
    surface: 'personal',
    templateKey: fixture.templateKey,
    url: `${baseUrl}/${fixture.slug}/g/[capability-token]`,
  };
}

async function main() {
  const results = [];

  for (const fixture of fixtures) {
    results.push(await verifyGeneric(fixture));

    if (genericOnly) {
      continue;
    }

    const token = process.env[fixture.tokenEnv];
    assertEvidence(
      typeof token === 'string' && token.length > 0,
      `Missing required environment variable ${fixture.tokenEnv}`,
    );
    results.push(await verifyPersonal(fixture, token));
  }

  console.log(
    JSON.stringify(
      {
        baseUrl,
        mode: genericOnly ? 'generic-only' : 'generic-and-personal',
        resultCount: results.length,
        results,
        verifiedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(`J2 live evidence audit failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
