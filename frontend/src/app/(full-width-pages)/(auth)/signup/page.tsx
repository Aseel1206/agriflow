import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Sign Up | AgriFlow",
  description: "Create your AgriFlow account as a farmer, buyer or logistics provider.",
};

export default function SignUp() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
