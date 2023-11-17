// IE11 implemented Crypto API as "mscrypto" instead of "crypto",
// and one function from Crypto API, "getrandomvalues", is used in "uuid" package
// https://caniuse.com/getrandomvalues
if (!window.crypto) {
	window.crypto = window.msCrypto;
}
