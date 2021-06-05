using System;
using System.Globalization;
using Finisherist.Core.Common.Enum;

namespace Finisherist.Api.Common.Extensions
{
    public static class StringExtensions
    {
        public static string ToTitleCase(this string stringValue){
            return CultureInfo.CurrentCulture.TextInfo.ToTitleCase(stringValue);
        }

        public static TEnum ToEnum<TEnum>(this string enumStringValue)
        {
            var statusEnum = (TEnum)Enum.Parse(typeof(TEnum), enumStringValue);
                return statusEnum;
        }

        public static bool IsValidEnumValue<TEnum>(this string enumStringValue)
        {
            return Enum.IsDefined(typeof(TEnum), enumStringValue);
        }
    }
}
