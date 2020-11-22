
exports.up = function(knex) {
  return knex.schema.createTable('company_url',function(table){
      table.string('company_id').primary();
      table.string('url');

      table.foreign('company_id').references('id').inTable('companies');
  })
};

exports.down = function(knex) {
    return knex.schema.dropTable('company_url');
};
