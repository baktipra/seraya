type PersonalGuestGreetingProps = {
  displayName: string;
};

/**
 * Guest-private content only. Presentation is intentionally supplied by the
 * selected invitation template through the personal composition slot.
 */
export function PersonalGuestGreeting({ displayName }: PersonalGuestGreetingProps) {
  return (
    <section aria-labelledby="personal-guest-greeting-title" data-personal-guest-greeting>
      <p data-personal-greeting-eyebrow>Undangan pribadi</p>
      <h2 data-personal-greeting-title id="personal-guest-greeting-title">
        Untuk {displayName}
      </h2>
      <p data-personal-greeting-lead>
        Dengan hangat, kami mengundang Anda untuk hadir dan berbagi kebahagiaan bersama kami.
      </p>
    </section>
  );
}
