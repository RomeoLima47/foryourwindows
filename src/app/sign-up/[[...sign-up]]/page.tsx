import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/50 px-4">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">FH Enterprise</h1>
        <p className="text-muted-foreground">Create your account to get started.</p>
      </div>
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg",
          },
        }}
      />
      <p className="mt-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} FH Enterprise. All rights reserved.
      </p>
    </div>
  );
}
