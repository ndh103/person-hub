using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PersonHub.Api.Areas.FinisherItems.Models;
using PersonHub.Domain.FinisherModule;
using Xunit;

namespace PersonHub.IntegrationTest.Tests.FinisherItems
{
    public static class FinsiherItemTestHelper
    {
        public static FinisherItemRequestDto CreateFinisherItemRequestDto(){

            var randomText = Guid.NewGuid().ToString();

            return new FinisherItemRequestDto(){
                Title = "Test title" + randomText,
                Description ="Test Description" + randomText,
                Status = Domain.FinisherModule.FinisherItemStatus.Planning,
                StartDate = DateTime.Now,
                FinishDate = null,
                Tags = new string[]{"tag 1", "tag "+ randomText}
            };
        }

        public static FinisherItemLogDto CreateFinisherItemLogDto(){
            var randomText = Guid.NewGuid().ToString();

            return new FinisherItemLogDto(){
                Content = "content" + randomText,
                CreatedDate = DateTime.Now,
            };
        }


        public static void AssertCompare(FinisherItemRequestDto requestDto, FinisherItem entity){
            Assert.True(requestDto.Title == entity.Title, "Title is not equal");
            Assert.True(requestDto.Description == entity.Description, "Description is not equal");

            Assert.True(TestHelper.EqualsUpToSeconds(requestDto.StartDate.Value, entity.StartDate.Value), $"StartDate is not equal. Expected Date {requestDto.StartDate} KindCase {requestDto.StartDate.Value.Kind} {requestDto.StartDate.Value.ToString("%K")}. Read date {entity.StartDate} KindCase {entity.StartDate.Value.Kind} {entity.StartDate.Value.ToString("%K")}");
            Assert.True(requestDto.FinishDate == entity.FinishDate, "FinishDate is not equal");

            Assert.True(requestDto.Tags.Count() == entity.Tags.Count(), "Tags are not equal");

            if(requestDto.Tags.Count() > 0){

                Assert.True(requestDto.Tags.All(r=> entity.Tags.Contains(r)), "Tags are not equal");
            }
        }
    }
}