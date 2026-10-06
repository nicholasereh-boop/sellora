import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { createSellerProduct, fetchSellerProduct, updateSellerProduct } from "../../api/sellers";
import { fetchCategories } from "../../api/catalog";
import GalleryEditor, { appendGalleryFields } from "../../components/product/GalleryEditor";
import VariantEditor from "../../components/product/VariantEditor";
import { buildVariantFields, variantsFromProduct } from "../../components/product/variantUtils";

// Core fields plus colour/size variants and extra gallery images
// (up to 8 extra + the main image = 9). See docs/react-migration/PROGRESS.md.
export default function SellerProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [removedGalleryIds, setRemovedGalleryIds] = useState([]);

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const { data: product } = useQuery({
    queryKey: ["seller-product", id],
    queryFn: () => fetchSellerProduct(id),
    enabled: isEdit,
  });

  const {
    register: field,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm();

  useEffect(() => {
    if (product) {
      reset({
        category: product.category ?? "",
        name: product.name,
        description: product.description,
        price: product.price,
        product_type: product.product_type,
        stock: product.stock,
        affiliate_commission_rate: product.affiliate_commission_rate,
        is_active: product.is_active,
      });
      const variants = variantsFromProduct(product);
      setColors(variants.colors);
      setSizes(variants.sizes);
    }
  }, [product, reset]);

  async function onSubmit(values) {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (key === "image" || key === "digital_file") return;
      formData.append(key, value ?? "");
    });
    Object.entries(buildVariantFields(colors, sizes)).forEach(([key, value]) => formData.append(key, value));
    appendGalleryFields(formData, galleryFiles, removedGalleryIds);
    if (values.image?.[0]) formData.append("image", values.image[0]);
    if (values.digital_file?.[0]) formData.append("digital_file", values.digital_file[0]);

    try {
      if (isEdit) {
        await updateSellerProduct(id, formData);
        toast.success("Product updated.");
      } else {
        await createSellerProduct(formData);
        toast.success("Product created.");
      }
      navigate("/seller/products");
    } catch (error) {
      const apiError = error.response?.data?.error;
      if (apiError?.fields) {
        Object.entries(apiError.fields).forEach(([f, messages]) => {
          setError(f, { message: messages[0] });
        });
      } else {
        toast.error(apiError?.message ?? "Could not save product.");
      }
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-3xl mb-8">
        {isEdit ? "Edit product" : "New product"}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="dash-card p-6 space-y-5">
        <div>
          <label className="dash-label">Name</label>
          <input {...field("name")} className="dash-input" />
          {errors.name && <p className="text-sm text-rust mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="dash-label">Category</label>
          <select {...field("category")} className="dash-input">
            <option value="">No category</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="dash-label">Description</label>
          <textarea {...field("description")} rows={4} className="dash-input" />
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
          <label className="dash-label">Image</label>
          <input type="file" accept="image/*" {...field("image")} className="text-sm text-mist-soft" />
        </div>

        <GalleryEditor
          existing={(product?.gallery_images ?? []).filter((g) => !removedGalleryIds.includes(g.id))}
          onRemoveExisting={(gid) => setRemovedGalleryIds((ids) => [...ids, gid])}
          files={galleryFiles}
          onFilesChange={setGalleryFiles}
          error={errors.gallery_images}
        />

        <div>
          <label className="dash-label">Digital file (if product type is Digital)</label>
          <input type="file" {...field("digital_file")} className="text-sm text-mist-soft" />
        </div>

        <div>
          <label className="dash-label">Affiliate commission rate (%)</label>
          <input type="number" step="1" {...field("affiliate_commission_rate")} className="dash-input" />
          {errors.affiliate_commission_rate && (
            <p className="text-sm text-rust mt-1">{errors.affiliate_commission_rate.message}</p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-mist-soft">
          <input type="checkbox" {...field("is_active")} defaultChecked />
          Active
        </label>

        <button disabled={isSubmitting} className="dash-btn-primary w-full">
          {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Create product"}
        </button>
      </form>
    </div>
  );
}
