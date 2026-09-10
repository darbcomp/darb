const mongoose = require("mongoose");
const { Readable } = require("stream");
const Category = require("../models/Category");
const Product = require("../models/Product");
const { cloudinary } = require("../config/cloudinary");
const slugify = require("../utils/slugify");

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const isCloudinaryReady = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
};

const parseBoolean = (value, defaultValue = true) => {
  if (value === undefined || value === null || value === "") return defaultValue;

  if (typeof value === "boolean") return value;

  return String(value).toLowerCase() === "true";
};

const parseNumber = (value, defaultValue = 0) => {
  if (value === undefined || value === null || value === "") return defaultValue;

  const number = Number(value);

  return Number.isFinite(number) ? number : defaultValue;
};

const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || "darb/categories",
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);

        return resolve(result);
      }
    );

    const readableStream = new Readable();
    readableStream._read = () => {};
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

const uploadCategoryImage = async (file) => {
  if (!file) return null;

  if (!isCloudinaryReady()) {
    throw new Error(
      "Cloudinary credentials are missing. Add Cloudinary credentials before uploading images."
    );
  }

  const result = await uploadBufferToCloudinary(file.buffer);

  return {
    url: result.secure_url,
    publicId: result.public_id,
    alt: file.originalname || "Darb category image",
  };
};

const buildCategoryPayload = async (body, file = null, existingCategory = null) => {
  const name = body.name?.trim() || existingCategory?.name;

  if (!name) {
    throw new Error("Category name is required.");
  }

  const payload = {
    name,
    description: body.description?.trim() || "",
    isActive: parseBoolean(body.isActive, true),
    sortOrder: parseNumber(body.sortOrder, 0),
    seoTitle: body.seoTitle?.trim() || "",
    seoDescription: body.seoDescription?.trim() || "",
  };

  if (body.slug) {
    payload.slug = slugify(body.slug);
  } else if (!existingCategory) {
    payload.slug = slugify(name);
  }

  const uploadedImage = await uploadCategoryImage(file);

  if (uploadedImage) {
    if (existingCategory?.image?.publicId && isCloudinaryReady()) {
      await cloudinary.uploader.destroy(existingCategory.image.publicId);
    }

    payload.image = {
      ...uploadedImage,
      alt: body.imageAlt?.trim() || uploadedImage.alt || name,
    };
  } else if (!existingCategory) {
    payload.image = {
      url: body.imageUrl?.trim() || "",
      publicId: body.imagePublicId?.trim() || "",
      alt: body.imageAlt?.trim() || name,
    };
  } else if (body.imageUrl !== undefined) {
    payload.image = {
      url: body.imageUrl?.trim() || existingCategory.image?.url || "",
      publicId:
        body.imagePublicId?.trim() || existingCategory.image?.publicId || "",
      alt: body.imageAlt?.trim() || existingCategory.image?.alt || name,
    };
  }

  return payload;
};

const getCategories = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(200).json({
        success: true,
        message: "Database not connected. Returning empty categories.",
        data: [],
      });
    }

    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select("name slug description image sortOrder seoTitle seoDescription")
      .lean();

    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch categories",
    });
  }
};

const getCategoryBySlug = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(404).json({
        success: false,
        message: "Category not found because database is not connected.",
      });
    }

    const category = await Category.findOne({
      slug: req.params.slug,
      isActive: true,
    })
      .select("name slug description image sortOrder seoTitle seoDescription")
      .lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch category",
    });
  }
};

const getAdminCategories = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(200).json({
        success: true,
        message: "Database not connected. Returning empty admin categories.",
        data: [],
      });
    }

    const categories = await Category.find({})
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    const categoryIds = categories.map((category) => category._id);

    const productCounts = await Product.aggregate([
      {
        $match: {
          $or: [{ category: { $in: categoryIds } }, { categories: { $in: categoryIds } }],
        },
      },
      {
        $project: {
          categoryIds: {
            $setUnion: [
              { $cond: [{ $gt: [{ $size: { $ifNull: ["$categories", []] } }, 0] }, "$categories", []] },
              { $cond: [{ $ne: ["$category", null] }, ["$category"], []] },
            ],
          },
          isActive: 1,
          isPlaceholder: 1,
        },
      },
      { $unwind: "$categoryIds" },
      {
        $group: {
          _id: "$categoryIds",
          totalProducts: { $sum: 1 },
          activeProducts: {
            $sum: {
              $cond: [{ $eq: ["$isActive", true] }, 1, 0],
            },
          },
          placeholderProducts: {
            $sum: {
              $cond: [{ $eq: ["$isPlaceholder", true] }, 1, 0],
            },
          },
        },
      },
    ]);

    const countMap = new Map(
      productCounts.map((item) => [
        String(item._id),
        {
          totalProducts: item.totalProducts,
          activeProducts: item.activeProducts,
          placeholderProducts: item.placeholderProducts,
        },
      ])
    );

    const enrichedCategories = categories.map((category) => ({
      ...category,
      productStats: countMap.get(String(category._id)) || {
        totalProducts: 0,
        activeProducts: 0,
        placeholderProducts: 0,
      },
    }));

    return res.status(200).json({
      success: true,
      count: enrichedCategories.length,
      data: enrichedCategories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch admin categories",
    });
  }
};

const getAdminCategoryById = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(404).json({
        success: false,
        message: "Category not found because database is not connected.",
      });
    }

    const category = await Category.findById(req.params.id).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    const productStats = await Product.aggregate([
      {
        $match: {
          $or: [{ category: category._id }, { categories: category._id }],
        },
      },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: {
            $sum: {
              $cond: [{ $eq: ["$isActive", true] }, 1, 0],
            },
          },
          placeholderProducts: {
            $sum: {
              $cond: [{ $eq: ["$isPlaceholder", true] }, 1, 0],
            },
          },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        ...category,
        productStats: productStats[0] || {
          totalProducts: 0,
          activeProducts: 0,
          placeholderProducts: 0,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch category.",
    });
  }
};

const createCategory = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message:
          "Database is not connected. Category creation is unavailable for now.",
      });
    }

    const payload = await buildCategoryPayload(req.body, req.file || null);

    const existingCategory = await Category.findOne({
      $or: [{ slug: payload.slug }, { name: new RegExp(`^${payload.name}$`, "i") }],
    });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: "A category with this name or slug already exists.",
      });
    }

    const category = await Category.create(payload);

    return res.status(201).json({
      success: true,
      message: "Category created successfully.",
      data: category,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create category.",
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message:
          "Database is not connected. Category update is unavailable for now.",
      });
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    const payload = await buildCategoryPayload(req.body, req.file || null, category);

    if (payload.slug) {
      const duplicateCategory = await Category.findOne({
        slug: payload.slug,
        _id: { $ne: category._id },
      });

      if (duplicateCategory) {
        return res.status(409).json({
          success: false,
          message: "A category with this slug already exists.",
        });
      }
    }

    const oldSnapshot = {
      name: category.name,
      slug: category.slug,
    };

    Object.assign(category, payload);

    const updatedCategory = await category.save();

    if (
      oldSnapshot.name !== updatedCategory.name ||
      oldSnapshot.slug !== updatedCategory.slug
    ) {
      await Product.updateMany(
        { category: updatedCategory._id },
        {
          $set: {
            "categorySnapshot.name": updatedCategory.name,
            "categorySnapshot.slug": updatedCategory.slug,
          },
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Category updated successfully.",
      data: updatedCategory,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update category.",
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message:
          "Database is not connected. Category deletion is unavailable for now.",
      });
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    const productsCount = await Product.countDocuments({
      $or: [{ category: category._id }, { categories: category._id }],
    });

    if (req.query.hard === "true") {
      if (productsCount > 0) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot permanently delete a category that still has products. Move or delete products first.",
        });
      }

      if (category.image?.publicId && isCloudinaryReady()) {
        await cloudinary.uploader.destroy(category.image.publicId);
      }

      await category.deleteOne();

      return res.status(200).json({
        success: true,
        message: "Category permanently deleted successfully.",
      });
    }

    category.isActive = false;
    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category deactivated successfully.",
      data: category,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to delete category.",
    });
  }
};

module.exports = {
  getCategories,
  getCategoryBySlug,
  getAdminCategories,
  getAdminCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
