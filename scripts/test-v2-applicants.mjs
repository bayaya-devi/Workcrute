const base = process.env.WORKCRUTE_URL || "http://127.0.0.1:8787";
const key = `test${crypto.randomUUID().replaceAll("-", "")}`;
const form = () => {
  const data = new FormData();
  const fields = {
    firstName: "Nadia",
    lastName: "Test",
    email: "nadia.test@example.com",
    phone: "+212612345678",
    city: "Casablanca",
    country: "Maroc",
    professionalTitle: "Responsable qualité",
    domain: "industry",
    domainOther: "",
    experienceLevel: "confirmed",
    availability: "one_month",
    motivation: "Candidature de validation automatisée.",
    language: "fr",
    consent: "true",
    idempotencyKey: key,
    answers: JSON.stringify({ workModes: ["onsite", "hybrid"] }),
  };
  Object.entries(fields).forEach(([name, value]) => data.append(name, value));
  data.append(
    "cv",
    new File(["%PDF-1.4\n% Workcrute integration test"], "cv-test.pdf", {
      type: "application/pdf",
    }),
  );
  return data;
};

const first = await fetch(`${base}/api/v2/applicants`, {
  method: "POST",
  body: form(),
});
const firstBody = await first.json();
if (first.status !== 201 || !/^WC-\d{6}-[A-Z0-9]{6}$/.test(firstBody.reference || "")) {
  throw new Error(`Initial submission failed: ${first.status} ${JSON.stringify(firstBody)}`);
}

const repeated = await fetch(`${base}/api/v2/applicants`, {
  method: "POST",
  body: form(),
});
const repeatedBody = await repeated.json();
if (repeated.status !== 200 || repeatedBody.reference !== firstBody.reference) {
  throw new Error(`Idempotency failed: ${repeated.status} ${JSON.stringify(repeatedBody)}`);
}

const invalid = new FormData();
invalid.append("idempotencyKey", `invalid${crypto.randomUUID().replaceAll("-", "")}`);
const invalidResponse = await fetch(`${base}/api/v2/applicants`, {
  method: "POST",
  body: invalid,
});
const invalidBody = await invalidResponse.json();
if (invalidResponse.status !== 422 || invalidBody.code !== "VALIDATION_ERROR") {
  throw new Error(`Validation failed: ${invalidResponse.status} ${JSON.stringify(invalidBody)}`);
}

console.log(
  JSON.stringify({
    ok: true,
    reference: firstBody.reference,
    idempotency: true,
    validation: true,
  }),
);
