import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchStoreSettings, updateStoreSettings } from "../../api/sellers";
import DocumentView, { CancelEditButton, maskAccount } from "../../components/dashboard/DocumentView";

export default function SellerStoreSettings() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const { data: profile, isLoading } = useQuery({
    queryKey: ["seller-store-settings"],
    queryFn: fetchStoreSettings,
  });

  const {
    register: field,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm();

  useEffect(() => {
    if (profile) {
      reset({ store_name: profile.store_name, store_description: profile.store_description });
    }
  }, [profile, reset]);

  async function onSubmit(values) {
    const formData = new FormData();
    formData.append("store_name", values.store_name);
    formData.append("store_description", values.store_description ?? "");
    if (values.logo?.[0]) formData.append("logo", values.logo[0]);
    if (values.banner?.[0]) formData.append("banner", values.banner[0]);

    try {
      await updateStoreSettings(formData);
      await queryClient.invalidateQueries({ queryKey: ["seller-store-settings"] });
      toast.success("Store settings updated.");
      setEditing(false);
    } catch (error) {
      const apiError = error.response?.data?.error;
      if (apiError?.fields) {
        Object.entries(apiError.fields).forEach(([f, messages]) => {
          setError(f, { message: messages[0] });
        });
      } else {
        toast.error(apiError?.message ?? "Could not update store settings.");
      }
    }
  }

  if (isLoading) return <p className="text-mist-soft">Loading...</p>;

  return (
    <div className="max-w-md">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Store settings</h1>
        {profile?.store_slug && (
          <Link to={`/store/${profile.store_slug}`} className="text-sm text-marigold hover:underline">
            View public store &rarr;
          </Link>
        )}
      </div>

      {profile?.store_name && !editing ? (
        <DocumentView
          title={profile.store_name}
          subtitle="Store profile"
          onEdit={() => {
            reset({ store_name: profile.store_name, store_description: profile.store_description });
            setEditing(true);
          }}
          sections={[
            {
              rows: [
                { label: "Store name", value: profile.store_name },
                { label: "Public address", value: profile.store_slug ? `/store/${profile.store_slug}` : "" },
                { label: "Description", value: profile.store_description, wide: true },
              ],
            },
          ]}
        >
          {(profile.logo || profile.banner) && (
            <section className="mt-8">
              <h3 className="text-xs uppercase tracking-wider text-mist-soft mb-3">Branding</h3>
              <div className="flex items-end gap-4">
                {profile.logo && (
                  <img src={profile.logo} alt="Store logo" className="h-20 w-20 rounded-xl object-cover ring-1 ring-surface-line" />
                )}
                {profile.banner && (
                  <img src={profile.banner} alt="Store banner" className="h-20 flex-1 min-w-0 rounded-xl object-cover ring-1 ring-surface-line" />
                )}
              </div>
            </section>
          )}
        </DocumentView>
      ) : (
      <form onSubmit={handleSubmit(onSubmit)} className="dash-card p-6 space-y-5">
        <div>
          <label className="dash-label">Store name</label>
          <input {...field("store_name")} className="dash-input" />
          {errors.store_name && <p className="text-sm text-rust mt-1">{errors.store_name.message}</p>}
        </div>
        <div>
          <label className="dash-label">Store description</label>
          <textarea {...field("store_description")} rows={4} className="dash-input" />
        </div>
        <div>
          <label className="dash-label">Logo</label>
          <input type="file" accept="image/*" {...field("logo")} className="text-sm text-mist-soft" />
        </div>
        <div>
          <label className="dash-label">Banner</label>
          <input type="file" accept="image/*" {...field("banner")} className="text-sm text-mist-soft" />
        </div>

        <button disabled={isSubmitting} className="dash-btn-primary w-full">
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>
        {profile?.store_name && <CancelEditButton onClick={() => setEditing(false)} />}
      </form>
      )}
    </div>
  );
}
