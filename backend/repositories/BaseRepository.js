class BaseRepository {
  constructor(model) {
    if (!model) {
      throw new Error('A Mongoose model must be supplied to BaseRepository');
    }
    this.model = model;
  }

  async create(data) {
    return this.model.create(data);
  }

  async findAll(filter = {}, options = {}) {
    let query = this.model.find(filter);
    if (options.populate) query = query.populate(options.populate);
    if (options.sort) query = query.sort(options.sort);
    return query;
  }

  async findById(id, options = {}) {
    let query = this.model.findById(id);
    if (options.populate) query = query.populate(options.populate);
    return query;
  }

  async findOne(filter = {}, options = {}) {
    let query = this.model.findOne(filter);
    if (options.select) query = query.select(options.select);
    if (options.populate) query = query.populate(options.populate);
    return query;
  }

  async updateById(id, data) {
    return this.model.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  }

  async deleteById(id) {
    return this.model.findByIdAndDelete(id);
  }
}

module.exports = BaseRepository;
