import { getLegalI18n } from "@/lib/i18n/server";
import { PolicyMeta } from "@/components/trust/policy-meta";
import { GavelIcon } from "@/components/icons";
import { TrustPage } from "@/components/trust/trust-page";

export const metadata = {
  title: "Responsible disclosure | SophionOS",
  description: "How to report security vulnerabilities.",
};

export default async function ResponsibleDisclosurePage() {
  const { t, locale } = await getLegalI18n();
  return (
    <TrustPage
      notice={locale === "en" ? undefined : t("legal.governingNotice")}
      icon={GavelIcon}
      title={t("legal.responsibleDisclosure")}
      description={t("legal.responsibleDisclosure.howToReportSecurityVulnerabilities")}
    >
      <PolicyMeta
        version="2.1"
        effective="October 19, 2026"
        summary={t("legal.responsibleDisclosure.replacesThePreviousPageAddsSafeharborTermsAClearScopeOfW")}
      />

      <p>
        {t("legal.responsibleDisclosure.ifYouBelieveYouHaveFoundASecurityVulnerabilityInSophiono")}
      </p>

      <h2>{t("legal.responsibleDisclosure.howToReport")}</h2>
      <ul>
        <li>
          {t("page.email")}{" "}
          <a href="mailto:security@sophionos.com">{t("legal.responsibleDisclosure.securitysophionoscom")}</a>{" "}
          {t("legal.responsibleDisclosure.withTheSubjectLineSecurityThisIsTheSecurityContactForSop")} <code>{t("legal.responsibleDisclosure.securitymd")}</code> {t("legal.responsibleDisclosure.namesForASelfhostedDeploymentContactItsOperatorInstead")}
        </li>
        <li>
          {t("legal.responsibleDisclosure.includeStepsToReproduceTheImpactYouBelieveItHasAndWhethe")}
        </li>
        <li>
          {t("legal.responsibleDisclosure.doNotIncludeRawApiKeysPasswordsOrSessionTokensRedactAnyt")}
        </li>
      </ul>

      <h2>{t("legal.responsibleDisclosure.safeHarbor")}</h2>
      <p>
        {t("legal.responsibleDisclosure.ifYouActInGoodFaithAndFollowThisPageWeConsiderYourResear")}
      </p>
      <ul>
        <li>
          {t("legal.responsibleDisclosure.youTestOnlyAgainstYourOwnAccountAndYourOwnDataOrATestAcc")}
        </li>
        <li>
          {t("legal.responsibleDisclosure.youStopAsSoonAsYouHaveEnoughEvidenceToDemonstrateTheIssu")}
        </li>
        <li>
          {t("legal.responsibleDisclosure.youDoNotDegradeInterruptOrDenyServiceToOtherUsersAndYouD")}
        </li>
        <li>
          {t("legal.responsibleDisclosure.youGiveUsAReasonableOpportunityToFixTheIssueBeforeAnyPub")}
        </li>
      </ul>
      <p>
        {t("legal.responsibleDisclosure.thisSafeHarborDoesNotCoverTheSystemsOfOurProvidersClerkS")}
      </p>

      <h2>{t("legal.responsibleDisclosure.inScope")}</h2>
      <ul>
        <li>
          {t("legal.responsibleDisclosure.authenticationAndSessionHandlingOnAppsophionoscomIncludi")}
        </li>
        <li>
          {t("legal.responsibleDisclosure.crossuserDataAccessAnyWayToReadOrWriteAnotherUsersRowsTh")}
        </li>
        <li>{t("legal.responsibleDisclosure.apiKeyHandlingAndThePlanAndEntitlementChecks")}</li>
        <li>{t("legal.responsibleDisclosure.serversideRequestForgeryInjectionAndAccesscontrolFlaws")}</li>
        <li>{t("legal.responsibleDisclosure.promptinjectionPathsThatCrossAUserBoundary")}</li>
      </ul>

      <h2>{t("legal.responsibleDisclosure.outOfScope")}</h2>
      <ul>
        <li>
          {t("legal.responsibleDisclosure.findingsThatRequireACompromisedDeviceACompromisedBrowser")}
        </li>
        <li>
          {t("legal.responsibleDisclosure.missingSecurityHeadersWithNoDemonstratedImpactClickjacki")}
        </li>
        <li>
          {t("legal.responsibleDisclosure.reportsFromAutomatedScannersWithNoProofOfImpactAndRateli")}
        </li>
        <li>
          {t("legal.responsibleDisclosure.socialEngineeringOfTheFounderOrAnyUserAndPhysicalAttacks")}
        </li>
        <li>
          {t("legal.responsibleDisclosure.denialOfServiceLoadTestingOrAnythingThatDegradesTheServi")}
        </li>
        <li>
          {t("legal.responsibleDisclosure.thirdpartyServicesListedIn")}{" "}
          <a href="/subprocessors">{t("legal.subprocessors")}</a>{t("legal.responsibleDisclosure.reportToThem")}
        </li>
      </ul>

      <h2>{t("legal.responsibleDisclosure.whatToExpect")}</h2>
      <p>
        {t("legal.responsibleDisclosure.weAcknowledgeReportsWithin7DaysTellYouWhetherWeConsiderT")}
      </p>
      <p className="text-sm text-muted-foreground">
        {t("legal.security.thisPageIsProductDocumentationNotLegalCounsel")}
      </p>
      <p>
        {t("legal.privacy.related")} <a href="/security">{t("legal.security")}</a> ·{" "}
        <a href="/privacy">{t("legal.privacy")}</a> · <a href="/terms">{t("legal.terms")}</a>
      </p>
    </TrustPage>
  );
}
