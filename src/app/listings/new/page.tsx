"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewListingPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    description: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    pricePerDay: 50,
    city: "",
    state: "",
    seats: 4,
    transmission: "AUTOMATIC",
    fuelType: "GASOLINE",
  });

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string | number) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleImages(files: FileList | null) {
    if (!files) return;

    const selected = Array.from(files).slice(0, 8);

    setImages(selected);

    const urls = selected.map((file) =>
      URL.createObjectURL(file)
    );

    setPreviews(urls);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let imageUrls: string[] = [];

      if (images.length > 0) {
        const uploadData = new FormData();

        images.forEach((image) => {
          uploadData.append("files", image);
        });

        const uploadRes = await fetch("/api/uploads", {
          method: "POST",
          body: uploadData,
        });

        const uploadJson = await uploadRes.json();

        if (!uploadRes.ok) {
          setError(
            uploadJson.error || "Could not upload images."
          );
          return;
        }

        imageUrls = uploadJson.urls;
      }

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          imageUrls,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error?.formErrors?.[0] ||
            data.error ||
            "Could not create listing."
        );
        return;
      }

      router.push(`/listings/${data.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] pt-24">
      <section className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#ff5a1f]">
            JayXZ Host
          </p>

          <h1 className="mt-3 text-4xl font-black text-neutral-950">
            List your vehicle
          </h1>

          <p className="mt-3 text-neutral-600">
            Add vehicle information and photos for admin review.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-10 space-y-8"
          >
            <div>
              <label className="mb-3 block text-sm font-black">
                Vehicle photos
              </label>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) =>
                  handleImages(e.target.files)
                }
                className="block w-full rounded-xl border border-neutral-300 bg-white p-3"
              />

              <p className="mt-2 text-sm text-neutral-500">
                Upload up to 8 photos. JPG, PNG or WebP. Maximum 8 MB each.
              </p>

              {previews.length > 0 && (
                <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
                  {previews.map((src, index) => (
                    <div
                      key={src}
                      className="aspect-square overflow-hidden rounded-2xl bg-neutral-100"
                    >
                      <img
                        src={src}
                        alt={`Vehicle preview ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <input
                placeholder="Listing title"
                required
                value={form.title}
                onChange={(e) =>
                  update("title", e.target.value)
                }
                className="rounded-xl border border-neutral-300 px-4 py-3"
              />

              <input
                placeholder="Make"
                required
                value={form.make}
                onChange={(e) =>
                  update("make", e.target.value)
                }
                className="rounded-xl border border-neutral-300 px-4 py-3"
              />

              <input
                placeholder="Model"
                required
                value={form.model}
                onChange={(e) =>
                  update("model", e.target.value)
                }
                className="rounded-xl border border-neutral-300 px-4 py-3"
              />

              <input
                type="number"
                placeholder="Year"
                required
                value={form.year}
                onChange={(e) =>
                  update(
                    "year",
                    parseInt(e.target.value, 10)
                  )
                }
                className="rounded-xl border border-neutral-300 px-4 py-3"
              />

              <input
                type="number"
                placeholder="Price per day"
                required
                value={form.pricePerDay}
                onChange={(e) =>
                  update(
                    "pricePerDay",
                    parseFloat(e.target.value)
                  )
                }
                className="rounded-xl border border-neutral-300 px-4 py-3"
              />

              <input
                type="number"
                placeholder="Seats"
                required
                value={form.seats}
                onChange={(e) =>
                  update(
                    "seats",
                    parseInt(e.target.value, 10)
                  )
                }
                className="rounded-xl border border-neutral-300 px-4 py-3"
              />

              <input
                placeholder="City"
                required
                value={form.city}
                onChange={(e) =>
                  update("city", e.target.value)
                }
                className="rounded-xl border border-neutral-300 px-4 py-3"
              />

              <input
                placeholder="State / Region"
                required
                value={form.state}
                onChange={(e) =>
                  update("state", e.target.value)
                }
                className="rounded-xl border border-neutral-300 px-4 py-3"
              />

              <select
                value={form.transmission}
                onChange={(e) =>
                  update("transmission", e.target.value)
                }
                className="rounded-xl border border-neutral-300 px-4 py-3"
              >
                <option value="AUTOMATIC">
                  Automatic
                </option>
                <option value="MANUAL">
                  Manual
                </option>
              </select>

              <select
                value={form.fuelType}
                onChange={(e) =>
                  update("fuelType", e.target.value)
                }
                className="rounded-xl border border-neutral-300 px-4 py-3"
              >
                <option value="GASOLINE">
                  Gasoline
                </option>
                <option value="HYBRID">Hybrid</option>
                <option value="ELECTRIC">
                  Electric
                </option>
                <option value="DIESEL">
                  Diesel
                </option>
              </select>
            </div>

            <textarea
              placeholder="Describe the vehicle"
              required
              value={form.description}
              onChange={(e) =>
                update("description", e.target.value)
              }
              className="min-h-36 w-full rounded-xl border border-neutral-300 px-4 py-3"
            />

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 font-bold text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[#e62e1f] to-[#ff5a1f] px-6 py-4 font-black text-white disabled:opacity-50"
            >
              {loading
                ? "Uploading & submitting..."
                : "Submit vehicle for approval"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
