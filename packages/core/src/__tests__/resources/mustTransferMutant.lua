if spore_ext_mode == 2 then
  local input_lock_hash, err = ckb.load_cell_by_field(spore_input_index, ckb.SOURCE_INPUT, ckb.CELL_FIELD_LOCK_HASH)
  local output_lock_hash, err = ckb.load_cell_by_field(spore_output_index, ckb.SOURCE_OUTPUT, ckb.CELL_FIELD_LOCK_HASH)
  if input_lock_hash == output_lock_hash then
    ckb.exit_script(87)
  end
end
