import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createAdminProduct, fetchAdminProduct, updateAdminProduct } from "../../api/admin";
import GalleryEditor, { appendGalleryFields } from "../../components/product/GalleryEditor";
import VariantEditor from "../../components/product/VariantEditor";
import { buildVariantFields, variantsFromProduct } from "../../components/product/variantUtils";

// Mirrors the legacy ProductForm's field set exactly: name, description,
// price, image, product_type, digital_file, stock, is_active. That form
// never set category or seller (admin-created products have neither) and
// this keeps that behavior unchanged.
export default function AdminProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [removedGalleryIds, setRemovedGalleryIds] = useState([]);

  const { data: product, isLoading } = useQuery({
    queryKey: ["admin-product", id],
    queryFn: () => fetchAdminProduct(id),
    enabled: isEdit,
  });

  const {
    register: field,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { product_type: "physical", stock: 0, is_active: true } });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description,
        price: product.price,
        product_type: product.product_type,
        stock: product.stock,
        is_active: product.is_active,
      });
      const variants = variantsFromProduct(product);
      setColors(variants.colors);
      setSizes(variants.sizes);
    }
  }, [product, reset]);

  async function onSubmit(values) {
    const formData = new FormData();
    ["name", "description", "price", "product_type", "stock"].forEach((key) =>
      formData.append(key, values[key] ?? "")
    );
    formData.append("is_active", values.is_active ? "true" : "false");
    Object.entries(buildVariantFields(colors, sizes)).forEach(([key, value]) => formData.append(key, value));
    appendGalleryFields(formData, galleryFiles, removedGalleryIds);
    if (values.image?.[0]) formData.append("image", values.image[0]);
    if (values.digital_file?.[0]) formData.append("digital_file", values.digital_file[0]);

    try {
      if (isEdit) {
        await updateAdminProduct(id, formData);
        toast.success("Product updated.");
      } else {
        await createAdminProduct(formData);
        toast.success("Product added.");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      navigate("/admin-panel/products");
    } catch (error) {
      const apiError = error.response?.data?.error;
      if (apiError?.fields) {
        Object.entries(apiError.fields).forEach(([f, messages]) => {
          setError(f, { message: Array.isArray(messages) ? messages[0] : String(messages) });
        });
      } else {
        toast.error(apiError?.message ?? "Could not save product.");
      }
    }
  }

  if (isEdit && isLoading) return <p className="text-mist-soft">Loading...</p>;

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-3xl mb-8">{isEdit ? "Edit product" : "Add product"}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="dash-card p-6 space-y-5">
        <div>
          <label className="dash-label">Name</label>
          <input {...field("name")} className="dash-input" />
          {errors.name && <p className="text-sm text-rust mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="dash-label">Description</label>
          <textarea {...field("description")} rows={4} className="dash-input" />
          {errors.description && <p className="text-sm text-rust mt-1">{errors.description.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="dash-label">Price (&#8358;)</label>
            <input type="number" step="0.01" {...field("price")} className="dash-input" />
            {errors.price && <p className="text-sm text-rust mt-1">{errors.price.message}</p>}
          </div>
          <div>
            <label className="dash-label">Stock</label>
            <input type="number" {...field("stock")} className="dash-input" />
            {errors.stock && <p className="text-sm text-rust mt-1">{errors.stock.message}</p>}
          </div>
        </div>
        <div>
          <label className="dash-label">Product type</label>
          <select {...field("product_type")} className="dash-input">
            <option value="physical">Physical</option>
            <option value="digital">Digital</option>
          </select>
        </div>
        <VariantEditor
          colors={colors}
          onColorsChange={setColors}
          sizes={sizes}
          onSizesChange={setSizes}
          errors={errors}
        />
        <div>
          <label className="dash-label">Image {isEdit && "(leave empty to keep current)"}</label>
          <input type="file" accept="image/*" {...field("image")} className="text-sm text-mist-soft" />
          {errors.image && <p className="text-sm text-rust mt-1">{errors.image.message}</p>}
        </div>
        <GalleryEditor
          existing={(product?.gallery_images ?? []).filter((g) => !removedGalleryIds.includes(g.id))}
          onRemoveExisting={(gid) => setRemovedGalleryIds((ids) => [...ids, gid])}
          files={galleryFiles}
          onFilesChange={setGalleryFiles}
          error={errors.gallery_images}
        />

        <div>
          <label className="dash-label">Digital file {isEdit && "(leave empty to keep current)"}</label>
          <input type="file" {...field("digital_file")} className="text-sm text-mist-soft" />
          {errors.digital_file && <p className="text-sm text-rust mt-1">{errors.digital_file.message}</p>}
        </div>
        <label className="flex items-center gap-2 text-sm text-mist-soft">
          <input type="checkbox" {...field("is_active")} />
          Active
        </label>

        <button disabled={isSubmitting} className="dash-btn-primary w-full">
          {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Add product"}
        </button>
      </form>
    </div>
  );
}
