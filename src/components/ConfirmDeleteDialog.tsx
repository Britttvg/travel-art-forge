import React from "react";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { useLanguage } from "@/components/LanguageProvider";

interface ConfirmDeleteDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  onConfirm: () => void;
  isDeleting?: boolean;
  itemCount?: number;
}

export function ConfirmDeleteDialog({ trigger, title, description, onConfirm, isDeleting = false, itemCount = 1 }: Readonly<ConfirmDeleteDialogProps>) {
  const { t } = useLanguage();
  const itemText = itemCount === 1 ? "item" : "items";
  const finalDescription = itemCount > 1 ? description.replace(/this (\w+)/, `${itemCount} ${itemText}`) : description;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{finalDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction disabled={isDeleting} onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isDeleting ? t("common.deleting") : t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
