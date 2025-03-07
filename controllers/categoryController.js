const Category = require('../model/categoryModel');

// Create a new category
const createCategory = async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(200).json({ message: 'Category created successfully!', category });
  } catch (error) {
    console.error('Error creating category:', error.message);
    res.status(500).json({ error: 'Internal server error while creating category.' });
  }
};

 
 const getAllCategories = async (req, res) => {
  try {
    const { roles} = req.user; // Extract role from the authenticated user
    // console.log(req.user)
    const { page, limit } = req.query; // Extract pagination parameters from query

    // Role-based access control
    if (!['Admin', 'HR', 'Manager'].includes(roles)) {
      return res.status(403).json({ message: 'Access denied: Unauthorized role.' });
    }

    let categories;
    let totalCategories;
    let totalPages;

    if (!page || !limit) {
      // Fetch all categories without pagination
      categories = await Category.find().sort({ createdAt: -1 });
      totalCategories = categories.length;
      totalPages = 1;  
    } else {
       const skip = (parseInt(page) - 1) * parseInt(limit);
      categories = await Category.find()
        .sort({ _id: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      totalCategories = await Category.countDocuments();
      totalPages = Math.ceil(totalCategories / parseInt(limit));
    }

    const response = {
      message: 'Categories fetched successfully',
      data: categories,
      summary: {
        totalCategories,
        totalPages,
        currentPage: page ? parseInt(page) : 1,
        perPage: limit ? parseInt(limit) : totalCategories,
        pagination: Boolean(page && limit),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching categories:', error.message);
    res.status(500).json({ error: 'Internal server error while fetching categories.' });
  }
};

// Get a single category by ID
const getSingleCategory = async (req, res) => {
  try {
    const { roles } = req.user; // Extract roles from the authenticated user
    const { _id } = req.query; // Extract category ID from the query

    // Role-based access control
    if (!['Admin','Manager'].includes(roles)) {
      return res.status(403).json({ message: 'Access denied: Unauthorized role.' });
    }

    if (!_id) {
      return res.status(400).json({ message: 'Category ID is required.' });
    }

    const category = await Category.findById(_id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    res.status(200).json({ message: 'Category fetched successfully', category });
  } catch (error) {
    console.error('Error fetching category:', error.message);
    res.status(500).json({ error: 'Internal server error while fetching category.' });
  }
};


// Update a category
const updateCategory = async (req, res) => {
  try {
    const { _id, ...updateFields } = req.body;
    const updatedCategory = await Category.findByIdAndUpdate(_id, updateFields, { new: true });

    if (!updatedCategory) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    res.status(200).json({ message: 'Category updated successfully!.', updatedCategory });
  } catch (error) {
    console.error('Error updating category:', error.message);
    res.status(500).json({ error: 'Internal server error while updating category.' });
  }
};

 

module.exports = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  
};
