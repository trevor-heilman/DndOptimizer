/**
 * Terms of Use and Content Licensing Page
 */

export function TermsOfUsePage() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-0">
      <h1 className="font-display text-3xl font-bold text-gold-300 mb-2">Terms of Use</h1>
      <p className="text-smoke-400 text-sm mb-10">Last updated: March 16, 2026</p>

      {/* 1. Acceptance */}
      <section className="mb-8">
        <h2 className="font-display text-xl font-semibold text-gold-400 mb-3">1. Acceptance of Terms</h2>
        <p className="text-parchment-300 text-sm leading-relaxed">
          By accessing or using Spellwright ("the Application"), you agree to be bound by these Terms of
          Use. If you do not agree, do not use the Application.
        </p>
      </section>

      {/* 2. SRD & Third-Party Content */}
      <section className="mb-8">
        <h2 className="font-display text-xl font-semibold text-gold-400 mb-3">2. Game Content &amp; SRD Compliance</h2>
        <p className="text-parchment-300 text-sm leading-relaxed mb-3">
          Spellwright contains spell names, descriptions, and rules text derived from the{' '}
          <strong className="text-parchment-100">Systems Reference Document 5.1 (SRD 5.1)</strong> and the{' '}
          <strong className="text-parchment-100">Systems Reference Document 5.2 / Free Rules 2024 (SRD 5.2)</strong>,
          both released by Wizards of the Coast LLC under the{' '}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold-400 underline hover:text-gold-300"
          >
            Creative Commons Attribution 4.0 International License (CC BY 4.0)
          </a>.
        </p>
        <p className="text-parchment-300 text-sm leading-relaxed mb-3">
          <strong className="text-parchment-100">You must comply with the SRD license when using this Application.</strong>{' '}
          Specifically:
        </p>
        <ul className="list-disc list-outside ml-5 text-parchment-300 text-sm leading-relaxed space-y-1.5">
          <li>
            You may use, share, and build upon SRD content in your own work, provided you give
            appropriate attribution to Wizards of the Coast LLC.
          </li>
          <li>
            You may not reproduce or distribute content from proprietary D&amp;D publications
            (e.g. Tasha's Cauldron of Everything, Xanathar's Guide to Everything, or non-SRD
            portions of the Player's Handbook) without a separate license from Wizards of the Coast.
          </li>
          <li>
            Custom spells you create in this Application are your own content and are not subject
            to the SRD license — however you are responsible for ensuring your custom content does
            not reproduce copyrighted text from non-SRD sources.
          </li>
        </ul>
        <div className="mt-4 p-3 bg-smoke-900 border border-gold-900/40 rounded text-xs text-smoke-400">
          <strong className="text-parchment-400">Attribution notice:</strong> This application uses
          material from the Systems Reference Document 5.1 and Systems Reference Document 5.2,
          © 2016, 2025 Wizards of the Coast LLC, licensed under{' '}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold-500 underline"
          >
            CC BY 4.0
          </a>.
          Dungeons &amp; Dragons and D&amp;D are trademarks of Wizards of the Coast LLC.
          This application is not affiliated with or endorsed by Wizards of the Coast LLC or Hasbro, Inc.
        </div>
      </section>

      {/* 3. User-Generated Content */}
      <section className="mb-8">
        <h2 className="font-display text-xl font-semibold text-gold-400 mb-3">3. User-Created Spells</h2>
        <p className="text-parchment-300 text-sm leading-relaxed mb-3">
          You may create custom spells and spellbooks within Spellwright. By creating content, you confirm:
        </p>
        <ul className="list-disc list-outside ml-5 text-parchment-300 text-sm leading-relaxed space-y-1.5">
          <li>You own or have the right to submit any content you enter.</li>
          <li>Your content does not reproduce verbatim text from copyrighted D&amp;D publications that are not covered by the SRD.</li>
          <li>You are solely responsible for any intellectual property issues arising from your custom content.</li>
        </ul>
      </section>

      {/* 4. Acceptable Use */}
      <section className="mb-8">
        <h2 className="font-display text-xl font-semibold text-gold-400 mb-3">4. Acceptable Use</h2>
        <p className="text-parchment-300 text-sm leading-relaxed mb-2">You agree not to:</p>
        <ul className="list-disc list-outside ml-5 text-parchment-300 text-sm leading-relaxed space-y-1.5">
          <li>Use the Application for any unlawful purpose.</li>
          <li>Attempt to reverse-engineer, scrape, or extract data in bulk from the Application.</li>
          <li>Upload malicious code, spam, or abusive content.</li>
          <li>Impersonate other users or Wizards of the Coast personnel.</li>
          <li>Circumvent rate limits or authentication controls.</li>
        </ul>
      </section>

      {/* 5. Disclaimer */}
      <section className="mb-8">
        <h2 className="font-display text-xl font-semibold text-gold-400 mb-3">5. Disclaimer of Warranties</h2>
        <p className="text-parchment-300 text-sm leading-relaxed">
          The Application is provided <strong className="text-parchment-100">"as is"</strong> without
          warranty of any kind. Spellwright is an independent, fan-made tool. It is not an official
          D&amp;D product. Spell analysis results are mathematical estimates intended as play aids, not
          official rulings. Always refer to the official rulebooks for definitive rules interpretations.
        </p>
      </section>

      {/* 6. Limitation of Liability */}
      <section className="mb-8">
        <h2 className="font-display text-xl font-semibold text-gold-400 mb-3">6. Limitation of Liability</h2>
        <p className="text-parchment-300 text-sm leading-relaxed">
          To the fullest extent permitted by law, Spellwright and its contributors shall not be liable
          for any indirect, incidental, or consequential damages arising out of your use of the
          Application or any content within it.
        </p>
      </section>

      {/* 7. Changes */}
      <section className="mb-8">
        <h2 className="font-display text-xl font-semibold text-gold-400 mb-3">7. Changes to These Terms</h2>
        <p className="text-parchment-300 text-sm leading-relaxed">
          We may update these Terms at any time. Continued use of the Application after changes
          constitutes acceptance of the revised Terms.
        </p>
      </section>

      {/* 8. Contact */}
      <section className="mb-8">
        <h2 className="font-display text-xl font-semibold text-gold-400 mb-3">8. Contact</h2>
        <p className="text-parchment-300 text-sm leading-relaxed">
          For questions about these Terms or the SRD license, refer to the project's GitHub repository
          or the{' '}
          <a
            href="https://www.dndbeyond.com/sources/dnd/basic-rules-2014"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold-400 underline hover:text-gold-300"
          >
            SRD documentation
          </a>.
        </p>
      </section>
    </div>
  );
}

export default TermsOfUsePage;
