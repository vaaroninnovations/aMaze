import { useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

const NONE = "none";

const schema = z.object({
  code: z.string().trim().min(1, "Subject ID is required").max(60),
  groupId: z.string(),
  sex: z.enum(["male", "female", "unknown"]),
  notes: z.string().max(2000),
});

export type SubjectFormValues = z.infer<typeof schema>;

export type SubjectSubmitValues = Omit<SubjectFormValues, "groupId"> & { groupId: string | null };

type Props = {
  trigger: ReactNode;
  title: string;
  submitLabel: string;
  groups: Doc<"groups">[];
  initial?: SubjectFormValues;
  /** Resolves true when saved; false keeps the dialog open (e.g. duplicate ID). */
  onSubmit: (values: SubjectSubmitValues) => Promise<boolean>;
};

export default function SubjectFormDialog({ trigger, title, submitLabel, groups, initial, onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(schema),
    values: initial ?? { code: "", groupId: NONE, sex: "unknown", notes: "" },
  });

  const submit = form.handleSubmit(async (values) => {
    const ok = await onSubmit({ ...values, groupId: values.groupId === NONE ? null : values.groupId });
    if (!ok) return;
    setOpen(false);
    if (!initial) form.reset({ code: "", groupId: values.groupId, sex: values.sex, notes: "" });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject ID</FormLabel>
                  <FormControl>
                    <Input placeholder="M01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE} className="cursor-pointer">
                          No group
                        </SelectItem>
                        {groups.map((g) => (
                          <SelectItem key={g._id} value={g._id} className="cursor-pointer">
                            <span className="size-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sex</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male" className="cursor-pointer">Male</SelectItem>
                        <SelectItem value="female" className="cursor-pointer">Female</SelectItem>
                        <SelectItem value="unknown" className="cursor-pointer">Not recorded</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional: strain, age, weight" rows={2} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Spinner />} {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export { NONE as NO_GROUP };
