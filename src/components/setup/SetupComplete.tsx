import { CheckCircle2 } from "lucide-react";

export const SetupComplete = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="rounded-full bg-green-100 p-6">
        <CheckCircle2 className="w-20 h-20 text-green-600" />
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">ყველაფერი მზადაა! 🎉</h2>
        <p className="text-muted-foreground text-lg">
          თქვენი ანგარიში წარმატებით გაკეთდა
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-6 max-w-md">
        <p className="text-sm text-muted-foreground text-center">
          ახლა შეგიძლიათ დაიწყოთ კლიენტებთან კომუნიკაცია, შექმნათ ჩატები და
          მართოთ თქვენი გუნდი ერთი პლატფორმიდან.
        </p>
      </div>
    </div>
  );
};
