import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchProfile, updateProfile } from "../../api/auth";

export default function ProfilePage() {
  const [avatarFile, setAvatarFile] = useState(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
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
      reset({
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        country: profile.country,
        bio: profile.bio,
      });
    }
  }, [profile, reset]);

  async function onSubmit(values) {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, value ?? ""));
    if (avatarFile) formData.append("avatar", avatarFile);

    try {
      await updateProfile(formData);
      toast.success("Profile updated.");
    } catch (error) {
      const apiError = error.response?.data?.error;
      if (apiError?.fields) {
        Object.entries(apiError.fields).forEach(([f, messages]) => {
          setError(f, { message: messages[0] });
        });
      } else {
        toast.error(apiError?.message ?? "Could not update profile.");
      }
    }
  }

  if (isLoading) return <p className="text-ink-soft">Loading profile...</p>;

  const inputClass = "w-full bg-transparent border border-paper-line rounded-lg px-3 py-2.5 focus:border-ink outline-none transition-colors";

  return (
    <div className="max-w-sm">
      <h1 className="font-display text-3xl mb-8">Edit profile</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {profile?.avatar && (
          <img
            src={profile.avatar}
            alt=""
            className="w-16 h-16 rounded-full object-cover"
          />
        )}
        <div>
          <label className="block text-sm text-ink-soft mb-1">Avatar</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
            className="text-sm text-ink-soft"
          />
        </div>

        {[
          ["first_name", "First name"],
          ["last_name", "Surname"],
          ["phone", "Phone"],
          ["country", "Country"],
        ].map(([name, label]) => (
          <div key={name}>
            <label className="block text-sm text-ink-soft mb-1">{label}</label>
            <input {...field(name)} className={inputClass} />
            {errors[name] && <p className="text-sm text-rust mt-1">{errors[name].message}</p>}
          </div>
        ))}

        <div>
          <label className="block text-sm text-ink-soft mb-1">Bio</label>
          <textarea {...field("bio")} rows={4} className={inputClass} />
        </div>

        <button
          disabled={isSubmitting}
          className="w-full bg-ink text-paper py-3 rounded-full hover:bg-indigo transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
