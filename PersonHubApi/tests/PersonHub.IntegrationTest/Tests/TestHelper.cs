using System;
using System.Linq;

namespace PersonHub.IntegrationTest.Tests;

public static class TestHelper
{
    public static int GetMaxValueOfEnum<TEnum>()
    {
        String strMaxEnumValue = Enum.GetValues(typeof(TEnum)).Cast<TEnum>().Max().ToString();
        int maxEnumValue = Convert.ToInt32(Enum.GetValues(typeof(TEnum)).Cast<TEnum>().Max());
        return maxEnumValue;
    }

    public static bool EqualsUpToSeconds(this DateTime dt1, DateTime dt2)
    {
        return dt1.Year == dt2.Year && dt1.Month == dt2.Month && dt1.Day == dt2.Day &&
               dt1.Hour == dt2.Hour && dt1.Minute == dt2.Minute && dt1.Second == dt2.Second;
    }
}