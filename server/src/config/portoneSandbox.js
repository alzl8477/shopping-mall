function isSandboxRequested() {
  return process.env.PORTONE_ALLOW_SANDBOX === "true";
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

// production에서는 별도 변수(PORTONE_ALLOW_SANDBOX_IN_PRODUCTION=true)를 명시적으로 켠 경우에만 허용
function isSandboxAllowedInProduction() {
  return process.env.PORTONE_ALLOW_SANDBOX_IN_PRODUCTION === "true";
}

function isSandboxAllowed() {
  if (!isSandboxRequested()) return false;
  return !isProduction() || isSandboxAllowedInProduction();
}

function logSandboxStatus() {
  if (isSandboxAllowed() && isProduction()) {
    console.warn(
      "[경고] production에서 포트원 테스트 결제 허용 중 (PORTONE_ALLOW_SANDBOX_IN_PRODUCTION=true). 실결제 전에 반드시 끄세요."
    );
  } else if (isSandboxAllowed()) {
    console.warn("[경고] 포트원 테스트 결제 허용 중 (PORTONE_ALLOW_SANDBOX=true)");
  } else if (isSandboxRequested() && isProduction()) {
    console.warn(
      "[경고] production에서는 PORTONE_ALLOW_SANDBOX=true가 무시됩니다. 테스트 결제가 필요하면 PORTONE_ALLOW_SANDBOX_IN_PRODUCTION=true를 명시적으로 추가하세요."
    );
  }
}

module.exports = { isSandboxAllowed, logSandboxStatus };
