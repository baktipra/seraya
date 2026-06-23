type PersonalGuestGreetingProps = {
  displayName: string;
};

/** Small composition layer: guest data never enters the published snapshot or template props. */
export function PersonalGuestGreeting({ displayName }: PersonalGuestGreetingProps) {
  return (
    <section
      aria-labelledby="personal-guest-greeting-title"
      className="mx-auto max-w-xl px-5 pt-8 text-center sm:px-8"
    >
      <p className="text-seraya-action-primary text-xs font-semibold tracking-[0.14em] uppercase">
        Undangan pribadi
      </p>
      <h2
        className="text-seraya-text-primary mt-3 font-serif text-3xl leading-tight sm:text-4xl"
        id="personal-guest-greeting-title"
      >
        Untuk {displayName}
      </h2>
      <p className="text-seraya-text-secondary mt-3 text-sm leading-6">
        Dengan hangat, kami mengundang Anda untuk hadir dan berbagi kebahagiaan bersama kami.
      </p>
    </section>
  );
}
