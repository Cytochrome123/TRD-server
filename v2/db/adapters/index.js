// const getGfs = require('..')

const indexDB = {
    deleteImage: async (res, gfs, id) => {
        try {
            if (!id || id === 'undefined') throw new Error('No image ID');
            // const _id = new mongoose.Types.ObjectId(id);
            const _id = id;
            gfs.delete(_id)
                .then(del => {
                    console.log('file deleted');
                    return 'File deleted'
                })
                .catch(error => {
                    throw new Error('Error deleting uploaded file', error);
                })
            // const del = await gfs.delete(_id)
            // // if(!del) throw new Error('Error deleting uploaded file');
            // if (!del) return 'Error deleting uploaded file';
            // console.log('file deleted');
            // return 'File deleted'
        } catch (error) {
            throw error;
        }
    },

    create: async (model, data) => {
        // return await model.create(data)
        return await new model(data).save();
    },

    findAll: async (model, query, projection = {}, options = {}) => {
        return await model.find(query, projection, options);
    },

    aggregateData: async(model, pipeline, options = {}) => {
        return await model.aggregate(pipeline, options);
    },

    // populateData: async(model, populateOptiions) => {
    //     return model.populate(populateOptiions).exec()
    // },

    findAndPopulateData: async(model, query, projection, options, populateOptiions) => {
        return model
			.find(query, projection, options)
			.populate(populateOptiions)
			.exec();
    },
}

module.exports = { indexDB };