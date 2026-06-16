"use client";
import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useArea, useAreas, useUpdateArea } from "@/lib/hooks/use-areas";
import { useEscapeBack } from "@/lib/hooks/use-escape-back";
import { useAuth } from "@/components/providers/auth-provider";
import { useUIStore } from "@/lib/stores/ui.store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaDialog } from "@/components/entities/area-dialog";
import { CreateAreaInput } from "@/lib/types/domain.types";
import { generateSlug } from "@/lib/utils";
import { getSuggestedAreaTypes } from "@/lib/utils/areas";

export default function EditAreaPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;
  const areaSlug = params.id as string;

  const { setPageTitle } = useUIStore();

  const { data: areas = [] } = useAreas();
  const { data: area, isLoading } = useArea(areaSlug);
  const updateArea = useUpdateArea(userId);
  useEscapeBack(area ? `/areas/${area.slug ?? area.id}` : null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (area) {
      setPageTitle(`Edit ${area.name}`);
    }
    return () => setPageTitle("");
  }, [area, setPageTitle]);

  const handleSubmit = async (data: CreateAreaInput) => {
    if (!area) return;

    try {
      const updateData = {
        name: data.name,
        type: data.type,
        description: data.description ?? undefined,
        icon: data.icon ?? undefined,
        color: data.color ?? undefined,
        slug: data.slug || generateSlug(data.name),
      };
      const updatedArea = await updateArea.mutateAsync({ id: area.id, ...updateData });
      submittedRef.current = true;
      router.push(`/areas/${updatedArea.slug || updatedArea.id}`);
    } catch {
      // Error shown via onError toast in useUpdateArea
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!area) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push("/areas")}>
            <ArrowLeft className="size-4" />
          </Button>
          <span>Area not found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon-sm" onClick={() => router.push(`/areas/${area.slug}`)}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Edit Area</h1>
      </div>
      <AreaDialog
        open={true}
        onOpenChange={(open) => {
          if (open) return;
          if (updateArea.isPending) return;
          if (submittedRef.current) return;
          router.push(`/areas/${area.slug || area.id}`);
        }}
        area={area}
        suggestedTypes={getSuggestedAreaTypes(areas)}
        onSubmit={handleSubmit}
        isLoading={updateArea.isPending}
      />
    </div>
  );
}
