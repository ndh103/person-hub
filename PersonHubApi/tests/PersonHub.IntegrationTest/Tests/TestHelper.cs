using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace PersonHub.IntegrationTest.Tests
{
    public static class TestHelper
    {
        public static int GetMaxValueOfEnum<TEnum>()
        {
            String strMaxEnumValue = Enum.GetValues(typeof(TEnum)).Cast<TEnum>().Max().ToString();
            int maxEnumValue = Convert.ToInt32(Enum.GetValues(typeof(TEnum)).Cast<TEnum>().Max());
            return maxEnumValue;
        }
    }
}