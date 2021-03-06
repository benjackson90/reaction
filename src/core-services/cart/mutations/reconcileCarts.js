import hashToken from "@reactioncommerce/api-utils/hashToken.js";
import ReactionError from "@reactioncommerce/reaction-error";
import convertAnonymousCartToNewAccountCart from "./convertAnonymousCartToNewAccountCart.js";
import reconcileCartsKeepAccountCart from "./reconcileCartsKeepAccountCart.js";
import reconcileCartsKeepAnonymousCart from "./reconcileCartsKeepAnonymousCart.js";
import reconcileCartsMerge from "./reconcileCartsMerge.js";

/**
 * @method reconcileCarts
 * @summary Call this with account credentials, passing in an anonymous cart, and the
 *   anonymous cart will be merged into the account cart. The "mode" argument allows
 *   you to specify whether the items should be merged, or if items should be kept from
 *   just one of the carts. If this mutation does not throw an error, the anonymous cart
 *   will be destroyed by the time this function returns.
 * @param {Object} context - an object containing the per-request state
 * @param {Object} input - mutation input
 * @param {String} input.anonymousCartId - The anonymous cart ID
 * @param {String} input.cartToken - The anonymous cart token
 * @param {String} [input.mode] - The reconciliation mode, "merge", "keepAccountCart", or "keepAnonymousCart". Default "merge"
 * @returns {Promise<Object>} Object in which `cart` property is set to the updated account cart
 */
export default async function reconcileCarts(context, input) {
  const { accountId, collections } = context;
  const { Cart } = collections;
  const { anonymousCartId, cartToken, mode = "merge" } = input;

  if (!accountId) throw new ReactionError("access-denied", "Access Denied");
  if (!anonymousCartId) throw new ReactionError("invalid-param", "anonymousCartId is required");
  if (!cartToken) throw new ReactionError("invalid-param", "cartToken is required");

  const accountCartSelector = { accountId };
  const anonymousCartSelector = { _id: anonymousCartId, anonymousAccessToken: hashToken(cartToken) };

  const carts = await Cart.find({
    $or: [accountCartSelector, anonymousCartSelector]
  }).toArray();

  const anonymousCart = carts.find((cart) => cart._id === anonymousCartId);
  if (!anonymousCart) throw new ReactionError("not-found", "Anonymous cart not found");

  const { shopId } = anonymousCart;

  const accountCart = carts.find((cart) => cart.accountId === accountId && cart.shopId === shopId);

  if (accountCart) {
    // We have both carts, so reconcile them according to "mode"
    switch (mode) {
      case "keepAccountCart":
        return {
          cart: await reconcileCartsKeepAccountCart({ accountCart, anonymousCartSelector, Cart })
        };

      case "keepAnonymousCart":
        return {
          cart: await reconcileCartsKeepAnonymousCart({ accountCart, anonymousCart, anonymousCartSelector, context })
        };

      case "merge":
        return {
          cart: await reconcileCartsMerge({ accountCart, anonymousCart, anonymousCartSelector, context })
        };

      default:
        throw new ReactionError("invalid-param", "mode must be keepAccountCart, keepAnonymousCart, or merge");
    }
  }

  // We have only an anonymous cart, so convert it to an account cart
  return {
    cart: await convertAnonymousCartToNewAccountCart(context, {
      anonymousCart,
      anonymousCartSelector
    })
  };
}
