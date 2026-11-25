import { getLegalI18n } from "@/lib/i18n/server";
import { PolicyMeta } from "@/components/trust/policy-meta";
import { LockIcon } from "@/components/icons";
import { TrustPage } from "@/components/trust/trust-page";

export const metadata = {
  title: "Privacy | SophionOS",
  description: "How SophionOS handles your personal context data.",
};

export default async function PrivacyPage() {
  const { t, locale } = await getLegalI18n();
  return (
    <TrustPage
      notice={locale === "en" ? undefined : t("legal.governingNotice")}
      icon={LockIcon}
      title={t("legal.privacy")}
      description={t("legal.privacy.howSophionosHandlesYourPersonalContextData")}
    >
      <PolicyMeta
        version="3.0"
        effective="October 19, 2026"
        summary={t("legal.privacy.adoptsTheReviewedCorrectedSophionosLegalTextPrivacyPolic")}
      />
      <p className="text-sm text-muted-foreground">
        <strong>{t("legal.privacy.draftNotYetInForce")}</strong> {t("legal.privacy.thisDocumentIsProductTextAwaitingReviewByQualifiedIndian")}
      </p>

      <p>
        {t("legal.privacy.thisPrivacyPolicyExplainsWhatPersonalDataSophionosCollec")}{" "}
        <a href="/terms">{t("legal.privacy.termsConditions")}</a> {t("legal.privacy.andOurMarketingCommunicationsPolicyAndYouConsentToEachIn")}
      </p>

      <h2>{t("legal.privacy.n1WhoWeAreAndWhatThisCovers")}</h2>
      <p>
        {t("legal.privacy.sophionosIsALifeOperatingSystemAndSystemOfRecordForInter")}
      </p>
      <p>
        {t("legal.privacy.thisPolicyCoversTheSophionosCloudServiceASelfhostedInsta")} <a href="/terms">{t("legal.privacy.selfhostedCoreVsCloud")}</a> {t("legal.privacy.inTheTermsForWhatThatMeansForProcessorsAndLegalBasis")}
      </p>

      <h2>{t("legal.privacy.n2ConsentAndHowWeRecordIt")}</h2>
      <p>
        {t("legal.privacy.weDoNotAskForBlanketConsentEachDocumentIsASeparateConsen")}
      </p>
      <table>
        <thead>
          <tr>
            <th>{t("legal.privacy.item")}</th>
            <th>{t("legal.privacy.required2")}</th>
            <th>{t("legal.privacy.whatItCovers")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t("legal.privacy.termsConditions")}</td>
            <td>{t("legal.privacy.required")}</td>
            <td>{t("legal.privacy.theRulesForUsingTheService")}</td>
          </tr>
          <tr>
            <td>{t("legal.privacy.privacyPolicy")}</td>
            <td>{t("legal.privacy.required")}</td>
            <td>{t("legal.privacy.thisDocument")}</td>
          </tr>
          <tr>
            <td>{t("legal.privacy.marketingCommunications")}</td>
            <td>
              {t("legal.privacy.optional")} <strong>{t("legal.privacy.offByDefault")}</strong>
            </td>
            <td>{t("legal.privacy.promotionalEmailOnly")}</td>
          </tr>
        </tbody>
      </table>
      <p>
        {t("legal.privacy.twoOfTheThreeAreRequiredBecauseTheServiceCannotFunctionW")}
      </p>
      <p>
        {t("legal.privacy.thereIsNoConsentBannerBecauseThereIsNothingToConsentToTh")}
      </p>
      <p>
        {t("legal.privacy.toWithdrawConsentToMarketingUseTheUnsubscribeLinkInAnyMe")}
      </p>
      <p>
        {t("legal.privacy.ifADocumentChangesMateriallyWePublishANewVersionWithItsO")}
      </p>

      <h2>{t("legal.privacy.n3WhatWeCollectAndWhy")}</h2>
      <p>
        {t("legal.privacy.weCollectTheMinimumNeededToRunAPersonalLifemanagementPro")}
      </p>

      <h3>{t("legal.privacy.n31AccountAndIdentity")}</h3>
      <table>
        <thead>
          <tr>
            <th>{t("legal.privacy.data")}</th>
            <th>{t("legal.privacy.purpose")}</th>
            <th>{t("legal.privacy.legalBasis")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t("legal.privacy.emailAddress2")}</td>
            <td>{t("legal.privacy.signinAccountRecoverySecurityAlerts")}</td>
            <td>{t("legal.privacy.performanceOfContract")}</td>
          </tr>
          <tr>
            <td>{t("legal.privacy.nameOptional")}</td>
            <td>{t("legal.privacy.personalisingTheInterface")}</td>
            <td>{t("legal.privacy.consent")}</td>
          </tr>
          <tr>
            <td>{t("legal.privacy.sessionTokensAndAuthenticationEvents")}</td>
            <td>{t("legal.privacy.keepingYouSignedInDetectingAccountTakeover")}</td>
            <td>{t("legal.privacy.legitimateInterests")}</td>
          </tr>
          <tr>
            <td>{t("legal.privacy.ipAddressAndRequestLogs")}</td>
            <td>{t("legal.privacy.securityRatelimitingDebuggingAndAbusePrevention")}</td>
            <td>{t("legal.privacy.legitimateInterests")}</td>
          </tr>
          <tr>
            <td>{t("legal.privacy.foundingCohortSeatPurchase")}</td>
            <td>{t("legal.privacy.confirmingAndHonouringASeatYouPaidFor")}</td>
            <td>{t("legal.privacy.performanceOfContractLegalObligation")}</td>
          </tr>
        </tbody>
      </table>
      <p>
        {t("legal.privacy.authenticationIsHandledByClerkWeReceiveYourClerkUserIdWe")}
      </p>

      <h3>{t("legal.privacy.n32YourContent")}</h3>
      <table>
        <thead>
          <tr>
            <th>{t("legal.privacy.data")}</th>
            <th>{t("legal.privacy.purpose")}</th>
            <th>{t("legal.privacy.legalBasis")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              {t("legal.privacy.areasGoalsProjectsTasksNotesResourcesTopicsContacts")}
            </td>
            <td>{t("legal.privacy.theCoreService")}</td>
            <td>{t("legal.privacy.performanceOfContract")}</td>
          </tr>
          <tr>
            <td>
              {t("legal.privacy.noteContentContactDetailsEmailPhoneProfessionalLinksDesc")}
            </td>
            <td>
              {t("legal.privacy.theCoreServiceStoredEncryptedAtTheApplicationLayer")}
            </td>
            <td>{t("legal.privacy.performanceOfContract")}</td>
          </tr>
          <tr>
            <td>{t("legal.privacy.fulltextSearchIndexOverTheAbove")}</td>
            <td>{t("legal.privacy.searchingYourOwnContent")}</td>
            <td>{t("legal.privacy.performanceOfContract")}</td>
          </tr>
        </tbody>
      </table>
      <p>
        {t("legal.privacy.thisIsYourDataWeDoNotSellItAndWeDoNotUseItToTrainModels")}
      </p>

      <h3>{t("legal.privacy.n33ProductOperation")}</h3>
      <table>
        <thead>
          <tr>
            <th>{t("legal.privacy.data")}</th>
            <th>{t("legal.privacy.purpose")}</th>
            <th>{t("legal.privacy.legalBasis")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t("legal.privacy.accountSettingsAndPreferences")}</td>
            <td>{t("legal.privacy.rememberingHowYouConfiguredTheApp")}</td>
            <td>{t("legal.privacy.performanceOfContract")}</td>
          </tr>
          <tr>
            <td>
              {t("legal.privacy.apiKeyMetadataNameExpiryLastUsedRevokedHashedSecretsOnly")}
            </td>
            <td>{t("legal.privacy.lettingYouManageProgrammaticAccess")}</td>
            <td>{t("legal.privacy.performanceOfContract")}</td>
          </tr>
          <tr>
            <td>{t("legal.privacy.subscriptionAndBillingRecords")}</td>
            <td>{t("legal.privacy.runningSubscriptionsAndInvoices")}</td>
            <td>{t("legal.privacy.performanceOfContractLegalObligation")}</td>
          </tr>
          <tr>
            <td>{t("legal.privacy.securityAndAccessLogs")}</td>
            <td>{t("legal.privacy.detectingAbuseInvestigatingIncidents")}</td>
            <td>{t("legal.privacy.legitimateInterests")}</td>
          </tr>
          <tr>
            <td>{t("legal.privacy.supportTicketsAndMessages")}</td>
            <td>{t("legal.privacy.answeringYourSupportRequests")}</td>
            <td>{t("legal.privacy.performanceOfContract")}</td>
          </tr>
        </tbody>
      </table>
      <p>
        {t("legal.privacy.rawApiKeySecretsAreNeverStoredAndNeverExportedOnlyHashes")}
      </p>

      <h3>{t("legal.privacy.n34AiClientsYouConnect")}</h3>
      <p>
        {t("legal.privacy.aiClientsAreAvailableToSignedinUsersTheyWorkOnlyForThePu")}
      </p>
      <table>
        <thead>
          <tr>
            <th>{t("legal.privacy.data")}</th>
            <th>{t("legal.privacy.purpose")}</th>
            <th>{t("legal.privacy.legalBasis")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t("legal.privacy.workspaceContentAnAuthorizedClientRequests")}</td>
            <td>{t("legal.privacy.servingTheClientYouConnected")}</td>
            <td>{t("legal.privacy.performanceOfContract")}</td>
          </tr>
          <tr>
            <td>
              {t("legal.privacy.apiKeyMetadataNameExpiryLastUsedRevokedHashedSecretsOnly")}
            </td>
            <td>{t("legal.privacy.lettingTheClientAuthenticateToSophionos")}</td>
            <td>{t("legal.privacy.performanceOfContract")}</td>
          </tr>
          <tr>
            <td>{t("legal.privacy.promptsAndResponsesHandledByTheClientAndItsProvider")}</td>
            <td>
              {t("legal.privacy.answeringYourQueryUnderThatProvidersOwnTerms")}
            </td>
            <td>{t("legal.privacy.consentByConnectingTheClient")}</td>
          </tr>
        </tbody>
      </table>
      <p>
        {t("legal.privacy.ifYouCreateAnApiKeyAndConnectClaudeCursorCodexOrAnotherM")}{" "}
        <a href="/data-and-ai">{t("legal.dataAndAi")}</a>.
      </p>
      <p>
        {t("legal.privacy.ifAClientIsEverExtendedToANewDataTypeOrANewUseForExample")}
      </p>

      <h3>{t("legal.privacy.n35Telemetry")}</h3>
      <p>
        {t("legal.privacy.weDoNotSendYourContentNotesContactsOrPromptsToAnyThirdpa")}
      </p>

      <h2>{t("legal.privacy.n4WhereYourDataGoes")}</h2>
      <table>
        <thead>
          <tr>
            <th>{t("legal.privacy.recipient")}</th>
            <th>{t("legal.privacy.why")}</th>
            <th>{t("legal.privacy.where")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t("legal.privacy.clerk")}</td>
            <td>{t("legal.privacy.authentication")}</td>
            <td>{t("legal.privacy.theirInfrastructureRegionPerYourClerkAccount")}</td>
          </tr>
          <tr>
            <td>{t("legal.privacy.supabaseOrYourSelfhostedPostgres")}</td>
            <td>{t("legal.privacy.primaryDatabaseHosting")}</td>
            <td>{t("legal.privacy.yourConfiguredRegion")}</td>
          </tr>
          <tr>
            <td>{t("legal.privacy.vercelHosted")}</td>
            <td>{t("legal.privacy.applicationHostingAndEdgeDelivery")}</td>
            <td>{t("legal.privacy.theirInfrastructureGlobalEdge")}</td>
          </tr>
          <tr>
            <td>
              {t("legal.privacy.dodoPaymentsDodoPaymentsIncDodopePaymentsLimitedAndSarva")}
            </td>
            <td>
              {t("legal.privacy.subscriptionBillingAndTheOnetimeFoundingseatCheckoutMerc")}
            </td>
            <td>{t("legal.privacy.theirInfrastructureUnitedStatesAndIndia")}</td>
          </tr>
          <tr>
            <td>{t("legal.privacy.resend")}</td>
            <td>{t("legal.privacy.transactionalEmailDelivery")}</td>
            <td>{t("legal.privacy.theirInfrastructureUnitedStates")}</td>
          </tr>
          <tr>
            <td>{t("legal.privacy.cronAndJobInfrastructure")}</td>
            <td>{t("legal.privacy.schedulingBriefsAndBackgroundJobs")}</td>
            <td>{t("legal.privacy.theirInfrastructureUnitedStates")}</td>
          </tr>
        </tbody>
      </table>
      <p>
        {t("legal.privacy.paymentsAreProcessedByDodoPaymentsWhichSellsToYouAsMerch")}
      </p>
      <p>
        {t("legal.privacy.theCurrentListOfSubprocessorsIsPublishedAt")}{" "}
        <a href="/subprocessors">{t("legal.privacy.theSubprocessorsPage")}</a>{t("legal.privacy.weWillGiveNoticeBeforeAddingASubprocessorThatCanAccessYo")}
      </p>
      <p>
        {t("legal.privacy.weDo")} <strong>{t("legal.privacy.not")}</strong> {t("legal.privacy.shareYourPersonalDataForAdvertisingWeDoNotSellItToAnyone")}
      </p>

      <h3>{t("legal.privacy.n41PaymentProcessing")}</h3>
      <p>
        <strong>{t("legal.privacy.whoSellsToYou")}</strong> {t("legal.privacy.paidPlansAndTheOnetimeFoundingSeatAreSoldByDodoPaymentsA")} <strong>{t("legal.privacy.merchantOfRecord")}</strong>{t("legal.privacy.dodoPaymentsIsTheSellerOfRecordForThatPurchaseItTakesYou")}{" "}
        <a href="/terms">{t("legal.privacy.termsConditions")}</a>{t("legal.privacy.whichAreBetweenYouAndTahaAalam")}
      </p>
      <p>
        <strong>{t("legal.privacy.whatGoesToDodoPayments")}</strong> {t("legal.privacy.atCheckoutDodoPaymentsReceives")}
      </p>
      <ul>
        <li>
          {t("legal.privacy.your")} <strong>{t("legal.privacy.name")}</strong> {t("legal.privacy.and")} <strong>{t("legal.privacy.emailAddress")}</strong>;
        </li>
        <li>
          {t("legal.privacy.your")} <strong>{t("legal.privacy.billingDetails")}</strong>{t("legal.privacy.includingYourBillingAddressAndCountry")}
        </li>
        <li>
          {t("legal.privacy.the")} <strong>{t("legal.privacy.paymentRecord")}</strong>{t("legal.privacy.theAmountTheCurrencyThePaymentMethodTheTransactionStatus")}
        </li>
        <li>
          {t("legal.privacy.your")} <strong>{t("legal.privacy.cardDetails")}</strong>{t("legal.privacy.whichGoToDodoPaymentsAndItsPaymentServiceProvidersAndNev")}
        </li>
      </ul>
      <p>
        <strong>{t("legal.privacy.whosePrivacyPolicyApplies")}</strong> {t("legal.privacy.forThatPaymentDataDodoPaymentsActsOnItsOwnAccountItDecid")}{" "}
        <a href="https://dodopayments.com/privacy-policy">
          {t("legal.privacy.dodopaymentscomprivacypolicy")}
        </a>
        {t("legal.privacy.weAreTheDataFiduciaryForTheDataYouCreateInTheServiceSect")}
      </p>

      <h2>{t("legal.privacy.n5CookiesAndLocalStorage")}</h2>
      <p>
        {t("legal.privacy.weUseASessionCookieToKeepYouSignedInWeUseLocalStorageFor")}
      </p>
      <p>
        {t("legal.privacy.weDoNotUseAdvertisingCookiesCrosssiteTrackingCookiesOrFi")}
      </p>

      <h2>{t("legal.privacy.n6HowLongWeKeepYourData")}</h2>
      <table>
        <thead>
          <tr>
            <th>{t("legal.privacy.dataCategory")}</th>
            <th>{t("legal.privacy.retention")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t("legal.privacy.yourAccountAndContent")}</td>
            <td>
              {t("legal.privacy.untilYouDeleteYourAccountThenPurgedWithin")}{" "}
              <strong>{t("legal.privacy.n30Days")}</strong> {t("legal.privacy.ofTheDeletionRequestCompleting")}
            </td>
          </tr>
          <tr>
            <td>{t("legal.privacy.securityAndAccessLogs")}</td>
            <td>
              <strong>{t("legal.privacy.n12Months")}</strong> {t("legal.privacy.fromTheEvent")}
            </td>
          </tr>
          <tr>
            <td>{t("legal.privacy.databaseBackups")}</td>
            <td>
              <strong>{t("legal.privacy.n30Days")}</strong>{t("legal.privacy.rollingABackupMayContainDataThatHasAlreadyBeenDeletedFro")}
            </td>
          </tr>
          <tr>
            <td>{t("legal.privacy.marketingConsentState")}</td>
            <td>
              {t("legal.privacy.heldWithYourEmailSubscriptionAnOptoutIsPermanentSoNoAddr")}
            </td>
          </tr>
          <tr>
            <td>{t("legal.privacy.grievanceRecords")}</td>
            <td>
              <strong>{t("legal.privacy.n36Months")}</strong> {t("legal.privacy.fromClosure")}
            </td>
          </tr>
          <tr>
            <td>{t("legal.privacy.consentRecord")}</td>
            <td>
              {t("legal.privacy.noneIsKeptAcceptanceIsTheUseOfTheServiceItselfSection2So")}
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        {t("legal.privacy.twoThingsFollowFromTheBackupWindowStatedPlainlyRatherTha")}
      </p>
      <p>
        {t("legal.privacy.weKeepBillingTaxAndAccountingRecordsForAsLongAsTheLawReq")}
      </p>

      <h2>{t("legal.privacy.n7YourRights")}</h2>
      <p>
        {t("legal.privacy.youHaveTheFollowingRightsEachOneHasAnInappControlNotJust")}
      </p>
      <table>
        <thead>
          <tr>
            <th>{t("legal.privacy.right")}</th>
            <th>{t("legal.privacy.howToExerciseIt")}</th>
            <th>{t("legal.privacy.whenWeRespond")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>{t("legal.privacy.accessPortability")}</strong>
            </td>
            <td>
              {t("legal.privacy.settingsPrivacyData")} <strong>{t("privacyCenter.downloadYourData")}</strong>{" "}
              {t("legal.privacy.givesYouAJsonFileOfYourPersonalData")}
            </td>
            <td>{t("legal.privacy.immediately")}</td>
          </tr>
          <tr>
            <td>
              <strong>{t("legal.privacy.correction")}</strong>
            </td>
            <td>
              {t("legal.privacy.settings")} <strong>{t("preferences.title")}</strong> {t("legal.privacy.forYourTimezoneAndLanguageYourNameUsernamePhoneAndPhotoA")} <strong>{t("settings.profile.title")}</strong>{t("legal.privacy.yourContentIsCorrectedWhereYouCreatedItAnythingYouCannot")}
            </td>
            <td>{t("legal.privacy.immediately")}</td>
          </tr>
          <tr>
            <td>
              <strong>{t("legal.privacy.erasure2")}</strong>
            </td>
            <td>
              {t("legal.privacy.settingsPrivacyData")} <strong>{t("legal.privacy.deleteMyDataAndAccount")}</strong>{t("legal.privacy.withATypedConfirmation")}
            </td>
            <td>{t("legal.privacy.purgeWithin30Days")}</td>
          </tr>
          <tr>
            <td>
              <strong>{t("legal.privacy.withdrawConsent")}</strong>
            </td>
            <td>
              {t("legal.privacy.deleteYourAccountFromSettingsPrivacyDataOrUseTheUnsubscr")}
            </td>
            <td>{t("legal.privacy.immediately")}</td>
          </tr>
          <tr>
            <td>
              <strong>{t("legal.privacy.nomination")}</strong>
            </td>
            <td>{t("legal.privacy.contactTheGrievanceOfficer")}</td>
            <td>{t("legal.privacy.within15Days")}</td>
          </tr>
          <tr>
            <td>
              <strong>{t("legal.privacy.grievanceRedressal")}</strong>
            </td>
            <td>{t("legal.privacy.byEmailToTheGrievanceOfficerSection9")}</td>
            <td>{t("legal.privacy.acknowledgedWithin48HoursResolvedWithin15Days")}</td>
          </tr>
          <tr>
            <td>
              <strong>{t("legal.privacy.complaintToTheBoard")}</strong>
            </td>
            <td>
              {t("legal.privacy.youMayComplainToTheDataProtectionBoardAtAnyTimeInAdditio")}
            </td>
            <td>{t("legal.privacy.asPerTheBoardsProcess")}</td>
          </tr>
        </tbody>
      </table>
      <p>
        {t("legal.privacy.withdrawingConsentToMarketingStopsEveryPromotionalEmailI")}
      </p>

      <h2>{t("legal.privacy.n8ChildrenAndUnder18Users")}</h2>
      <p>
        {t("legal.privacy.theServiceIsNotDirectedAtChildrenAndIsNotIntendedForAnyo")}
      </p>
      <p>
        {t("legal.privacy.theServiceIsForPeople18AndOverSoWeDoNotAskForAnAgeDeclar")}
      </p>
      <p>
        {t("legal.privacy.ifYouBelieveAChildUnder18HasCreatedAnAccountOrProvidedPe")}
      </p>
      <p>
        {t("legal.privacy.weDoNotKnowinglyServeAdvertisingToChildrenAndWeDoNotUseB")}
      </p>

      <h2>{t("legal.privacy.n9GrievanceRedressal")}</h2>
      <p>
        {t("legal.privacy.everyDataPrincipalHasTheRightToLodgeAGrievanceWithUsAndT")}
      </p>
      <p>
        <strong>{t("legal.privacy.grievanceOfficer")}</strong>
      </p>
      <table>
        <thead>
          <tr>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t("areaDialog.name")}</td>
            <td>
              <strong>{t("legal.privacy.tahaAalam")}</strong>
            </td>
          </tr>
          <tr>
            <td>{t("page.email")}</td>
            <td>
              <strong>
                <a href="mailto:privacy@sophionos.com">
                  {t("legal.privacy.privacysophionoscom")}
                </a>
              </strong>
            </td>
          </tr>
          <tr>
            <td>{t("legal.privacy.postalAddress")}</td>
            <td>
              <strong>
                {t("legal.privacy.b202WellingtonParkApartmentWellingtonStreetRichmondTownB")}
              </strong>
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        {t("legal.privacy.tahaAalamASoleProprietorTradingAsSophionosIsTheDesignate")}
      </p>
      <p>
        <strong>{t("legal.privacy.whatYouCanExpect")}</strong>
      </p>
      <table>
        <thead>
          <tr>
            <th>{t("stepShell.step")}</th>
            <th>{t("legal.privacy.commitment")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t("legal.privacy.acknowledgement")}</td>
            <td>
              {t("legal.privacy.within")} <strong>{t("legal.privacy.n48Hours")}</strong> {t("legal.privacy.ofUsReceivingYourGrievance")}
            </td>
          </tr>
          <tr>
            <td>{t("legal.privacy.resolution")}</td>
            <td>
              {t("legal.privacy.within")} <strong>{t("legal.privacy.n15Days")}</strong>
            </td>
          </tr>
          <tr>
            <td>{t("legal.privacy.statusUpdates")}</td>
            <td>{t("legal.privacy.atLeastEvery5DaysWhileItIsOpen")}</td>
          </tr>
          <tr>
            <td>{t("legal.privacy.escalation")}</td>
            <td>
              {t("legal.privacy.ifYouAreNotSatisfiedYouMayComplainToTheDataProtectionBoa")}
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        {t("legal.privacy.raiseAGrievanceByEmailingTheOfficerAt")}{" "}
        <a href="mailto:privacy@sophionos.com">{t("legal.privacy.privacysophionoscom")}</a> {t("legal.privacy.withTheSubjectLineDpdpGrievance")}
      </p>
      <p>
        {t("legal.privacy.whenYouRaiseAGrievanceWeWillAskOnlyForWhatWeNeedToInvest")}
      </p>

      <h2>{t("legal.privacy.n10Security")}</h2>
      <p>
        {t("legal.privacy.weEncryptSensitiveFieldsAtTheApplicationLayerBeforeTheyR")}
      </p>
      <p>
        {t("legal.privacy.noSystemIsPerfectlySecureSophionosIsSelfhostedWhoeverOpe")}{" "}
        <a href="/security">{t("legal.security")}</a> {t("legal.privacy.forTheFullStatementOfWhatTheSoftwareDoesAndDoesNotClaim")}
      </p>

      <h2>{t("legal.privacy.n11InternationalDataTransfers")}</h2>
      <p>
        {t("legal.privacy.weOperateTheServiceFromTheUnitedStatesAndUseServiceProvi")}
      </p>

      <h2>{t("legal.privacy.n12NoticeToEuropeanUsers")}</h2>
      <p>
        <strong>{t("legal.privacy.scope")}</strong> {t("legal.privacy.thisSectionAppliesToYouIfYouAreInTheEuropeanEconomicArea")}
      </p>
      <p>
        <strong>{t("legal.privacy.controller")}</strong> {t("legal.privacy.tahaAalamASoleProprietorTradingAsSophionosIsTheControlle")}{" "}
        <a href="mailto:privacy@sophionos.com">{t("legal.privacy.privacysophionoscom")}</a>{t("legal.privacy.paymentDataIsTheOneExceptionDodoPaymentsSellsToYouAsMerc")}
      </p>
      <p>
        <strong>{t("legal.privacy.legalBases")}</strong> {t("legal.privacy.weRelyOn")}
      </p>
      <ul>
        <li>
          {t("legal.privacy.contractualNecessityToProvideTheServiceYouAskedForYourAc")}
        </li>
        <li>{t("legal.privacy.legalObligationForTaxAccountingAndLawfulRequests")}</li>
        <li>
          {t("legal.privacy.legitimateInterestsInKeepingTheServiceSecureAndWorkingPr")}
        </li>
        <li>
          {t("legal.privacy.consentWhereYouChooseToConnectAnAiClientOrEnableAnOption")}
        </li>
      </ul>
      <p>
        <strong>{t("legal.privacy.yourRights")}</strong> {t("legal.privacy.youMayAskUsToGiveYouAccessToYourPersonalDataCorrectInacc")}{" "}
        <a href="mailto:privacy@sophionos.com">{t("legal.privacy.privacysophionoscom")}</a>{t("legal.privacy.weMayNeedToVerifyYourIdentityAndWillAnswerWithinOneMonth")}
      </p>

      <h2>{t("legal.privacy.n13NoticeToUsStateResidents")}</h2>
      <p>
        {t("legal.privacy.ifYouLiveInAStateWithAComprehensiveConsumerPrivacyLawCal")}
      </p>
      <p>
        {t("legal.privacy.categoriesCollectedInTheLast12MonthsIdentifiersEmailName")}
      </p>
      <p>
        {t("legal.privacy.toExerciseARightEmail")}{" "}
        <a href="mailto:privacy@sophionos.com">{t("legal.privacy.privacysophionoscom")}</a>{t("legal.privacy.weWillVerifyYourIdentityAgainstYourAccountEmailAndRespon")}
      </p>

      <h2>{t("legal.privacy.n14NoticeToUsersInIndia")}</h2>
      <p>
        {t("legal.privacy.thisSectionAppliesIfYouAreInIndiaOrIfTheDigitalPersonalD")}
      </p>
      <p>
        <strong>{t("legal.privacy.whoIsWho")}</strong> {t("legal.privacy.youAreThe")} <strong>{t("legal.privacy.dataPrincipal")}</strong>{t("legal.privacy.tahaAalamASoleProprietorTradingAsSophionosIsThe")}{" "}
        <strong>{t("legal.privacy.dataFiduciary")}</strong> {t("legal.privacy.forThePersonalDataYouGiveUsAndForTheWorkspaceContentYouC")}{" "}
        <a href="/subprocessors">{t("legal.subprocessors")}</a>.
      </p>
      <p>
        <strong>{t("legal.privacy.consentAndNotice")}</strong> {t("legal.privacy.weProcessYourPersonalDataOnlyOnTheBasisYouGiveUsWhenYouC")}
      </p>
      <p>
        <strong>{t("legal.privacy.yourRightsAsADataPrincipal")}</strong>
      </p>
      <ul>
        <li>
          <strong>{t("legal.privacy.access")}</strong>{t("legal.privacy.obtainASummaryOfThePersonalDataWeProcessAboutYouAndOfOur")}
        </li>
        <li>
          <strong>{t("legal.privacy.correctionAndErasure")}</strong>{t("legal.privacy.correctInaccurateOrIncompletePersonalDataAndHavePersonal")}
        </li>
        <li>
          <strong>{t("legal.privacy.grievanceRedressal")}</strong>{t("legal.privacy.raiseAGrievanceWithOurGrievanceOfficerInTheMannerAndWith")}
        </li>
        <li>
          <strong>{t("legal.privacy.nomination")}</strong>{t("legal.privacy.nominateAPersonToExerciseTheRightsAboveOnYourBehalfInThe")}
        </li>
        <li>
          <strong>{t("legal.privacy.withdrawConsent")}</strong>{t("legal.privacy.asDescribedInSection2AtAnyTimeWithTheSameEaseAsGivingIt")}
        </li>
        <li>
          <strong>{t("legal.privacy.complaintToTheBoard")}</strong>{t("legal.privacy.complainToTheDataProtectionBoardOfIndiaAtAnyTimeInAdditi")}
        </li>
      </ul>
      <p>
        <strong>{t("legal.privacy.theSafeguardsWeTake")}</strong> {t("legal.privacy.whereTheDpdpRules2025ApplyRule6RequiresADataFiduciaryToT")} <a href="/security">{t("legal.security")}</a>{t("legal.privacy.encryptionInTransitAndAtRestHashedApiKeysPeruserRowIsola")}
      </p>
      <p>
        <strong>{t("legal.privacy.erasure")}</strong> {t("legal.privacy.rule8OfTheDpdpRulesImposesAFixedInactivitytriggeredErasu")}
      </p>

      <h2>{t("legal.privacy.n15ChangesToThisPolicy")}</h2>
      <p>
        {t("legal.privacy.aChangeIsPublishedAsANewVersionWithItsOwnVersionNumberAn")}
      </p>

      <h2>{t("legal.privacy.n16Contact")}</h2>
      <p>
        <strong>
          <a href="mailto:privacy@sophionos.com">{t("legal.privacy.privacysophionoscom")}</a>
        </strong>
        {t("legal.privacy.monitoredThisIsTheAddressForPrivacyMattersAndForGrievanc")}
      </p>

      <p className="text-sm text-muted-foreground">
        <strong>{t("legal.privacy.statusDraft")}</strong> {t("legal.privacy.thisDocumentRequiresReviewByQualifiedIndianCounselBefore")}
      </p>

      <p>
        {t("legal.privacy.related")} <a href="/terms">{t("legal.terms")}</a> ·{" "}
        <a href="/security">{t("legal.security")}</a> · <a href="/data-and-ai">{t("legal.dataAndAi")}</a>{" "}
        · <a href="/subprocessors">{t("legal.subprocessors")}</a>
      </p>
    </TrustPage>
  );
}
