import { useRef, useState, type FormEvent } from "react";
import { useAction } from "convex/react";
import {
  CheckCircle2,
  CircleHelp,
  Globe2,
  Mail,
  MapPin,
  Send,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/convex/_generated/api.js";
import AppHeader from "@/components/app-header.tsx";
import SiteFooter from "@/components/site-footer.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

const SUBJECTS = [
  "General Inquiry",
  "Technical Support",
  "Bug Report",
  "Feature Request",
  "Research Collaboration",
  "Account & Privacy",
  "Other",
] as const;

const FAQS = [
  {
    question: "Can I use aMaze for academic research?",
    answer:
      "Yes. aMaze is designed to support behavioural tracking and analysis in laboratory animal research.",
  },
  {
    question: "Can I save and download my analysis results?",
    answer:
      "Users can save and download supported project data and analysis outputs using the available project-management features.",
  },
  {
    question: "How do I report a technical issue?",
    answer:
      'Select "Technical Support" or "Bug Report" in the contact form and provide details about the problem.',
  },
  {
    question: "Can I request new features?",
    answer:
      'Yes. Select "Feature Request" and describe the functionality you would like to see.',
  },
];

const contactDetails = [
  {
    icon: Mail,
    label: "Email",
    content: (
      <a
        href="mailto:vaaroninnovations@gmail.com"
        className="break-all text-primary underline-offset-4 hover:underline"
      >
        vaaroninnovations@gmail.com
      </a>
    ),
  },
  { icon: UserRound, label: "Contact person", content: "Dr. Vara Prasad Saka" },
  {
    icon: MapPin,
    label: "Location",
    content: "Kolkata, West Bengal, India",
  },
  {
    icon: Globe2,
    label: "Website",
    content: (
      <a
        href="https://amaze.drvara.si/"
        className="text-primary underline-offset-4 hover:underline"
      >
        amaze.drvara.si
      </a>
    ),
  },
];

export default function ContactPage() {
  const submitContact = useAction(api.contact.submit);
  const submissionLock = useRef(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] =
    useState<(typeof SUBJECTS)[number]>("General Inquiry");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<
    { kind: "success" | "error"; text: string } | undefined
  >();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionLock.current) return;
    submissionLock.current = true;
    setSubmitting(true);
    setFeedback(undefined);
    try {
      await submitContact({
        name: name.trim(),
        email: email.trim(),
        subject,
        message: message.trim(),
        website,
      });
      setFeedback({
        kind: "success",
        text: "Your message has been sent. Thank you for contacting aMaze.",
      });
      setName("");
      setEmail("");
      setSubject("General Inquiry");
      setMessage("");
      setWebsite("");
    } catch {
      setFeedback({
        kind: "error",
        text: "We couldn’t send your message. Please try again later or email vaaroninnovations@gmail.com.",
      });
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
        <header className="mx-auto max-w-3xl space-y-3 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            Contact
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Get in Touch
          </h1>
          <p className="text-base leading-7 text-muted-foreground sm:text-lg">
            Have a question, need technical assistance, or want to collaborate?
            We&apos;re here to help you make the most of aMaze.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section
            aria-labelledby="contact-details-heading"
            className="space-y-5 rounded-xl border bg-card p-5 sm:p-7"
          >
            <div>
              <h2
                id="contact-details-heading"
                className="text-xl font-semibold"
              >
                Contact information
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Reach out directly or send a message using the form.
              </p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {contactDetails.map(({ icon: Icon, label, content }) => (
                <div
                  key={label}
                  className="flex min-w-0 items-start gap-3 rounded-lg border bg-background/60 p-4 transition-colors hover:border-primary/40"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-md border border-primary/20 bg-primary/[0.07] text-primary">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="break-words text-sm font-medium">
                      {content}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </section>

          <section
            aria-labelledby="contact-form-heading"
            className="space-y-5 rounded-xl border bg-card p-5 sm:p-7"
          >
            <div>
              <h2 id="contact-form-heading" className="text-xl font-semibold">
                Send us a message
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Fields marked required must be completed.
              </p>
            </div>
            <form
              onSubmit={(event) => void submit(event)}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Full Name *</Label>
                  <Input
                    id="contact-name"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    minLength={2}
                    maxLength={120}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email Address *</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    maxLength={254}
                    required
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-subject">Subject</Label>
                <select
                  id="contact-subject"
                  value={subject}
                  onChange={(event) =>
                    setSubject(event.target.value as (typeof SUBJECTS)[number])
                  }
                  disabled={submitting}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                >
                  {SUBJECTS.map((option) => (
                    <option key={option} value={option} className="bg-popover">
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-message">Message *</Label>
                <Textarea
                  id="contact-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  minLength={10}
                  maxLength={5000}
                  rows={7}
                  required
                  disabled={submitting}
                  placeholder="How can we help?"
                />
                <p className="text-right text-xs text-muted-foreground">
                  {message.length}/5000
                </p>
              </div>
              <div
                aria-hidden="true"
                className="absolute -left-[10000px] top-auto size-px overflow-hidden"
              >
                <Label htmlFor="contact-website">Leave this field empty</Label>
                <Input
                  id="contact-website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
              </div>
              {feedback && (
                <p
                  role={feedback.kind === "error" ? "alert" : "status"}
                  aria-live="polite"
                  className={
                    feedback.kind === "success"
                      ? "flex items-start gap-2 text-sm text-emerald-600 dark:text-emerald-400"
                      : "text-sm text-destructive"
                  }
                >
                  {feedback.kind === "success" && (
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0"
                    />
                  )}
                  {feedback.text}
                </p>
              )}
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={submitting}
              >
                {submitting ? (
                  "Sending message…"
                ) : (
                  <>
                    <Send aria-hidden="true" />
                    Send Message
                  </>
                )}
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">
                Your message and email address are sent to aMaze support and are
                not shown to other users. See our{" "}
                <Link
                  to="/privacy-policy"
                  className="text-primary underline underline-offset-4"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </form>
          </section>
        </div>

        <section aria-labelledby="faq-heading" className="space-y-5">
          <div className="space-y-2">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-primary">
              <CircleHelp aria-hidden="true" className="size-4" />
              Support
            </p>
            <h2
              id="faq-heading"
              className="text-2xl font-semibold tracking-tight"
            >
              Frequently Asked Questions
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {FAQS.map(({ question, answer }) => (
              <article
                key={question}
                className="rounded-xl border bg-card p-5 transition-colors hover:border-primary/40"
              >
                <h3 className="font-semibold">{question}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {answer}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
