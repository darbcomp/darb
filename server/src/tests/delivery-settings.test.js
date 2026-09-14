const test = require("node:test");
const assert = require("node:assert/strict");

const StoreSettings = require("../models/StoreSettings");
const { getGovernorateDeliveryFee } = require("../utils/shipping");

test("new store settings use launch delivery configuration version 2", () => {
  const settings = new StoreSettings();

  assert.equal(settings.launchConfigVersion, 2);
  assert.equal(settings.delivery.defaultFee, 100);
  assert.deepEqual(settings.delivery.governorateFees.toObject(), {
    cairo: 100,
    giza: 100,
    alexandria: 100,
    other: 100,
  });
});

test("delivery falls back to 100 EGP for every governorate group", () => {
  assert.equal(getGovernorateDeliveryFee("Cairo"), 100);
  assert.equal(getGovernorateDeliveryFee("الجيزة"), 100);
  assert.equal(getGovernorateDeliveryFee("Alexandria"), 100);
  assert.equal(getGovernorateDeliveryFee("Aswan"), 100);
});
