import Image from "next/image";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  "password-mismatch": "Incorrect email or password. Please try again.",
  "magic-link-failed":
    "We couldn't send the magic link. Please try again or use a password.",
  "callback-error":
    "Authentication failed. Please return to the login page and try again.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const initialError = params.error
    ? (errorMessages[params.error] ?? "An unexpected error occurred.")
    : undefined;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4">
      <Image
        src="/brand/ccc-logo-full.svg"
        alt="Craven Cancer Classic"
        width={220}
        height={79}
        priority
        className="h-12 w-auto mb-6"
      />
      <LoginForm initialError={initialError} />
    </div>
  );
}
