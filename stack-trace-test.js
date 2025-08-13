// Stack Trace Test Script
// This script tests if the console.error stack traces now point to the actual call site

function testFunction() {
  console.error("Test error from testFunction");
}

function anotherFunction() {
  testFunction();
}

function deepNestedFunction() {
  anotherFunction();
}

// Test immediate console.error
console.error("Direct console.error call");

// Test nested function calls
setTimeout(() => {
  deepNestedFunction();
}, 100);

// Test with actual Error object
try {
  throw new Error("Actual error object");
} catch (e) {
  console.error("Caught error:", e);
}
