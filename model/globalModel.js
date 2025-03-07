
  const { User  } = require("./userModel");
  const {Lead} = require("./leadModel");
  
 
const models = {
     user: User,
     lead:Lead,
 
  };
  
   
  // Population configuration for all models
const populationConfig = {
 
  lead:[
    { path: 'assignedTo' },
   ] 
};

// Function to get population rules dynamically
const getModelByName = (modelName) => {
  if (!modelName || typeof modelName !== "string") {
      console.error("Invalid model name provided:", modelName);
      return null;
  }

  const lowerCaseModelName = modelName.toLowerCase();
  const model = models[lowerCaseModelName] || null;
  if (!model) {
      console.error("Model not found for type:", modelName);
  }
  return model;
};
const getPopulationRules = (modelName) => populationConfig[modelName.toLowerCase()] || [];

  // Export both models and the function
  module.exports = {
    getPopulationRules,
    getModelByName
  };
  