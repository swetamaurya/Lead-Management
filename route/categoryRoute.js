const express = require('express');
const router = express.Router();

const { createCategory, getAllCategories,getSingleCategory, updateCategory} = require('../controllers/categoryController');
const auth = require('../middleware/authorization');

router.post('/create', auth(["Admin","Manager","HR"]), createCategory);
router.get('/getAll', auth(["Admin","Manager","HR"]), getAllCategories);
router.get('/get', auth(["Admin","Manager","HR"]), getSingleCategory);
router.post('/update', auth(["Admin","Manager","HR"]), updateCategory);
// router.post('/delete', deleteCategory);

module.exports = router;
